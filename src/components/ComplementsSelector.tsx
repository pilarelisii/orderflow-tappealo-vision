import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Product } from "@/types/product";

function ComplementsSelector({
	products,
	currentProductId,
	value,
	onChange,
}: {
	products: Product[];
	currentProductId?: string;
	value: string[];
	onChange: (ids: string[]) => void;
}) {
	const availableProducts = products.filter(
		(p) => p.id !== currentProductId && p.enabled
	);

	const toggleComplement = (id: string) => {
		if (value.includes(id)) {
			onChange(value.filter((x) => x !== id));
			return;
		}

		if (value.length >= 3) {
			toast.error("Podés seleccionar hasta 3 complementos");
			return;
		}

		onChange([...value, id]);
	};

	return (
		<div className="space-y-2">
			<Label>Complementos sugeridos</Label>

			<div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto rounded-md border p-2">
				{availableProducts.map((p) => {
					const selected = value.includes(p.id);

					return (
						<button
							key={p.id}
							type="button"
							onClick={() => toggleComplement(p.id)}
							className={`text-left rounded-md border px-3 py-2 text-sm transition ${
								selected
									? "border-primary bg-primary/10 text-primary"
									: "border-border hover:bg-muted"
							}`}
						>
							<div className="font-medium">{p.name}</div>
							<div className="text-xs text-muted-foreground">${p.price}</div>
						</button>
					);
				})}
			</div>

			<p className="text-xs text-muted-foreground">
				Seleccionados: {value.length}/3
			</p>
		</div>
	);
}

export default ComplementsSelector;