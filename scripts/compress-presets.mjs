/**
 * 预设缩略图压缩脚本
 * 将 public/presets/ 中的原始图片压缩为 WebP 格式缩略图
 * 目标尺寸：320px 宽（适配 2x Retina 的 160px 显示宽度）
 */
import sharp from 'sharp';
import { readdir, mkdir } from 'fs/promises';
import { join, parse } from 'path';

const PRESETS_DIR = join(process.cwd(), 'public', 'presets');
const THUMBS_DIR = join(PRESETS_DIR, 'thumbs');
const TARGET_WIDTH = 320;
const WEBP_QUALITY = 65;

async function main() {
  await mkdir(THUMBS_DIR, { recursive: true });

  const files = await readdir(PRESETS_DIR);
  const imageFiles = files.filter(f =>
    f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png') || f.endsWith('.webp')
  );

  console.log(`找到 ${imageFiles.length} 张图片，开始压缩...\n`);

  let totalOriginal = 0;
  let totalCompressed = 0;

  for (const file of imageFiles) {
    const inputPath = join(PRESETS_DIR, file);
    const { name } = parse(file);
    const outputPath = join(THUMBS_DIR, `${name}.webp`);

    try {
      const inputMeta = await sharp(inputPath).metadata();
      const originalSize = (await sharp(inputPath).toBuffer()).length;
      totalOriginal += originalSize;

      await sharp(inputPath)
        .resize(TARGET_WIDTH, null, {
          withoutEnlargement: true,
          fit: 'inside',
        })
        .webp({ quality: WEBP_QUALITY, effort: 6 })
        .toFile(outputPath);

      const outputMeta = await sharp(outputPath).metadata();
      const compressedSize = (await sharp(outputPath).toBuffer()).length;
      totalCompressed += compressedSize;

      const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
      console.log(
        `${file}: ${inputMeta.width}x${inputMeta.height} → ${outputMeta.width}x${outputMeta.height} | ` +
        `${(originalSize / 1024).toFixed(1)}KB → ${(compressedSize / 1024).toFixed(1)}KB (-${ratio}%)`
      );
    } catch (err) {
      console.error(`❌ ${file} 压缩失败:`, err.message);
    }
  }

  console.log(`\n总计: ${(totalOriginal / 1024).toFixed(1)}KB → ${(totalCompressed / 1024).toFixed(1)}KB (-${((1 - totalCompressed / totalOriginal) * 100).toFixed(1)}%)`);
}

main().catch(console.error);
