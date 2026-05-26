# Import images requis par defaut

## Contexte
L import d images etait optionnel, ce qui laissait passer un import sans ZIP. Il fallait rendre le ZIP obligatoire par defaut, tout en laissant une option pour desactiver l import d images.

## Modifications realisees
- Ajout d une option "Ne pas importer les images" (checkbox).
- Import d images obligatoire par defaut si la case n est pas cochee.
- Le champ ZIP est desactive quand l option est cochee et le fichier ZIP en memoire est vide.
- Le bouton d import et la validation bloquent si le ZIP est manquant et que l option n est pas cochee.
- Le prechargement des fichiers locaux ignore le ZIP quand l option est activee.

## Comportement concret
- Cas standard: l utilisateur doit fournir le ZIP, sinon l import est bloque.
- Cas sans images: l utilisateur coche "Ne pas importer les images" et peut lancer l import sans ZIP.

## Code modifie (extrait)
```tsx
// Flag to allow skipping image import.
const [skipImageImport, setSkipImageImport] = useState(false);

const handlePreloadDefaultFiles = async () => {
	try {
		addLog("Pré-chargement des fichiers locaux par défaut...");

		const prodRes = await fetch("/csv/data-import/import-csv-data-18-mai-26 - produit.csv");
		const prodBlob = await prodRes.blob();
		const prodFileObj = new File([prodBlob], "import-csv-data-18-mai-26 - produit.csv", { type: "text/csv" });
		setProductFile(prodFileObj);

		const combRes = await fetch("/csv/data-import/import-csv-data-18-mai-26 - produit_declinaison.csv");
		const combBlob = await combRes.blob();
		const combFileObj = new File([combBlob], "import-csv-data-18-mai-26 - produit_declinaison.csv", { type: "text/csv" });
		setCombinationFile(combFileObj);

		const orderRes = await fetch("/csv/data-import/import-csv-data-18-mai-26 - commande.csv");
		const orderBlob = await orderRes.blob();
		const orderFileObj = new File([orderBlob], "import-csv-data-18-mai-26 - commande.csv", { type: "text/csv" });
		setOrderFile(orderFileObj);

		// Only preload ZIP when image import is enabled.
		if (!skipImageImport) {
			const zipRes = await fetch("/csv/data-import/images.zip");
			const zipBlob = await zipRes.blob();
			const zipFileObj = new File([zipBlob], "images.zip", { type: "application/zip" });
			setZipFile(zipFileObj);
		}

		addLog("Tous les fichiers locaux ont été pré-chargés avec succès !");
	} catch (err: any) {
		addLog(`Erreur de pré-chargement : ${err.message}`);
	}
};

const handleImport = async () => {
	// ZIP is required unless the user explicitly disables image import.
	if (!productFile || !combinationFile || !orderFile || (!skipImageImport && !zipFile)) {
		alert("Veuillez sélectionner les 3 fichiers CSV requis et le ZIP d'images.");
		return;
	}
	// ...
	const imagesMap: Record<string, Blob> = {};
	// Parse images only when ZIP import is active.
	if (zipFile && !skipImageImport) {
		addLog(`Lecture de ${zipFile.name}...`);
		try {
			const zip = await JSZip.loadAsync(zipFile);
			for (const [filename, fileObj] of Object.entries(zip.files)) {
				if (!fileObj.dir && /\.(png|jpg|jpeg)$/i.test(filename)) {
					const blob = await fileObj.async("blob");
					const cleanName = filename.split("/").pop() || filename;
					imagesMap[cleanName] = blob;
				}
			}
			addLog(`${Object.keys(imagesMap).length} images extraites du ZIP.`);
		} catch (e: any) {
			reportError("Images ZIP", zipFile.name, `Impossible d'extraire le ZIP: ${e.message}`, null);
		}
	}
	// ...
};

<input
	id="skip-images"
	type="checkbox"
	checked={skipImageImport}
	onChange={(e) => {
		const checked = e.target.checked;
		setSkipImageImport(checked);
		// Clear ZIP if user disables image import.
		if (checked) {
			setZipFile(null);
		}
	}}
	style={{ width: "20px", height: "20px", cursor: "pointer", margin: 0 }}
/>

<input
	type="file"
	accept=".zip"
	onChange={(e) => handleFileChange(e, "zip")}
	// Lock the ZIP input when skipping images.
	disabled={skipImageImport}
/>

<button
	className="import-btn"
	onClick={handleImport}
	// Button blocked if ZIP missing and images are required.
	disabled={status === "importing" || !productFile || !combinationFile || !orderFile || (!skipImageImport && !zipFile)}
>
	{status === "importing" ? "Importation en cours..." : "Lancer l'importation"}
</button>
```
