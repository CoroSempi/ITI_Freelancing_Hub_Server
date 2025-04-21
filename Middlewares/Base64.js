export default async function toBase64(file) {
  const base64 = file.buffer.toString("base64");
  const ext = file.mimetype.split("/")[1];
  const base64String = `data:image/${ext};base64,${base64}`;
  return base64String;
}

