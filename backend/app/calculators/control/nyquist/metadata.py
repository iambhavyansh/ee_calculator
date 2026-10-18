from backend.app.registry.calculator_registry import CalculatorMetadata

nyquist_metadata = CalculatorMetadata(
    id="control.nyquist",
    name="Nyquist Plot",
    category="control",
    category_label="Control Systems",
    description="Nyquist frequency response plot and stability analysis for continuous and discrete SISO systems.",
    endpoint="/control/nyquist",
    execution="sync",
    mode_field=None,
    modes=[],
)

