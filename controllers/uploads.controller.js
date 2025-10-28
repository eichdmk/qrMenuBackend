import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');

export const uploadImage = async (request, reply) => {
  try {
    const data = await request.file();
    if (!data) return reply.status(400).send({ message: 'Файл не загружен' });

    const filename = `${Date.now()}-${data.filename}`;
    const filepath = path.join(uploadDir, filename);
    
    // Преобразуем файл в buffer и записываем
    const buffer = await data.toBuffer();
    await fs.promises.writeFile(filepath, buffer);

    return reply.status(201).send({ image_url: `/uploads/${filename}` });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при загрузке файла' });
  }
};

// Удаление изображения
export const deleteImage = async (request, reply) => {
  try {
    const { filename } = request.params;
    const filePath = path.join(uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ message: 'Файл не найден' });
    }

    fs.unlinkSync(filePath);
    return reply.send({ message: 'Файл успешно удалён' });
  } catch (err) {
    console.error(err);
    return reply.status(500).send({ message: 'Ошибка при удалении файла' });
  }
};
