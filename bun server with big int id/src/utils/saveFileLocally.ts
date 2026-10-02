import path from "path";
import fs from "fs";

const TEMP_DIR = "./public/temp";

if (!fs.existsSync(TEMP_DIR)) {
	fs.mkdirSync(TEMP_DIR, { recursive: true });
}

export const saveFileLocally = async (
	file: File,
	fieldname: string = "file"
): Promise<string> => {
	const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
	const ext = path.extname(file.name);
	const filename = `${fieldname}-${uniqueSuffix}${ext}`;
	const filepath = path.join(TEMP_DIR, filename);

	await Bun.write(filepath, file);

	return filepath;
};