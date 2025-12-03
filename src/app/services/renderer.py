# services/renderers.py
import chainlit as cl
from typing import Optional, Dict
from services.table_parser import extract_first_table


class ChainlitStream:
    """
    Renders assistant responses with visual activity indicators.
    
    Uses Chainlit's Step API to show spinners during processing,
    with nested steps for tool executions.
    """
    
    def __init__(self):
        self.root_step: Optional[cl.Step] = None
        self.text_msg: Optional[cl.Message] = None
        self._tool_steps: Dict[str, cl.Step] = {}
        self._active_tool: Optional[str] = None

    async def start(self):
        """
        Start the processing indicator with a spinner.
        Creates a Step that shows visual activity to the user.
        """
        self.root_step = cl.Step(
            name="Processing",
            type="run",
            show_input=False
        )
        await self.root_step.__aenter__()
        self.root_step.output = "🔄 Analyzing your query..."
        await self.root_step.update()

    async def on_tool_call(self, name: str, args: str):
        """
        Show a nested step with spinner when a tool starts executing.
        """
        tool_name = name or "tool"
        
        # Update root step to show tool is being called
        if self.root_step:
            self.root_step.output = f"🛠️ Executing **{tool_name}**..."
            await self.root_step.update()
        
        # Create nested step for the tool with its own spinner
        tool_step = cl.Step(
            name=tool_name,
            type="tool",
            show_input=True
        )
        await tool_step.__aenter__()
        
        # Show truncated args if available
        if args:
            truncated_args = args[:500] + "..." if len(args) > 500 else args
            tool_step.input = truncated_args
        
        tool_step.output = "Running..."
        await tool_step.update()
        
        self._tool_steps[tool_name] = tool_step
        self._active_tool = tool_name

    async def on_tool_output(self, name: str, out: str):
        """
        Complete the tool step and show output.
        """
        tool_name = name or "tool"
        
        if tool_name in self._tool_steps:
            tool_step = self._tool_steps[tool_name]
            # Show truncated output
            if out:
                truncated_out = out[:800] + "..." if len(out) > 800 else out
                tool_step.output = f"✅ Completed\n\n```\n{truncated_out}\n```"
            else:
                tool_step.output = "✅ Completed"
            await tool_step.update()
            # Exit the step context to show completion
            await tool_step.__aexit__(None, None, None)
            del self._tool_steps[tool_name]
        
        # Update root step
        if self.root_step:
            self.root_step.output = "🔄 Processing response..."
            await self.root_step.update()
        
        self._active_tool = None

    async def on_text_delta(self, token: str):
        """
        Stream text tokens to the response message.
        """
        if self.text_msg is None:
            # Close the root step spinner before showing response
            await self._complete_processing()
            # Create message for streaming response
            self.text_msg = cl.Message(content="")
            await self.text_msg.send()
        await self.text_msg.stream_token(token or "")

    async def on_text_done(self, text: str):
        """
        Finalize the response message with optional table extraction.
        """
        # Ensure processing step is closed
        await self._complete_processing()
        
        if self.text_msg is None:
            self.text_msg = cl.Message(content=text or "")
            await self.text_msg.send()
            return

        # Optional: upgrade a markdown pipe-table to a DataFrame element
        if text:
            try:
                df, remainder = extract_first_table(text)
            except Exception:
                df, remainder = None, text

            if df is not None:
                self.text_msg.content = (remainder or " ").strip()
                try:
                    self.text_msg.elements = [cl.Dataframe(df=df, name="Results")]
                except Exception:
                    self.text_msg.content = text  # fallback to raw text
            else:
                self.text_msg.content = text

        await self.text_msg.update()

    async def _complete_processing(self):
        """
        Complete the root processing step, removing the spinner.
        """
        if self.root_step:
            self.root_step.output = "✅ Analysis complete"
            await self.root_step.update()
            await self.root_step.__aexit__(None, None, None)
            self.root_step = None
        
        # Clean up any remaining tool steps
        for tool_name, tool_step in list(self._tool_steps.items()):
            tool_step.output = "✅ Completed"
            await tool_step.update()
            await tool_step.__aexit__(None, None, None)
        self._tool_steps.clear()

    async def complete(self):
        """
        Public method to ensure all steps are properly closed.
        Call this when processing is done or on error.
        """
        await self._complete_processing()

    async def error(self, error_msg: str):
        """
        Handle error state - close steps and show error.
        """
        if self.root_step:
            self.root_step.output = f"❌ Error: {error_msg}"
            await self.root_step.update()
            await self.root_step.__aexit__(None, None, None)
            self.root_step = None
        
        # Clean up tool steps on error
        for tool_name, tool_step in list(self._tool_steps.items()):
            tool_step.output = "❌ Interrupted"
            await tool_step.update()
            await tool_step.__aexit__(None, None, None)
        self._tool_steps.clear()
