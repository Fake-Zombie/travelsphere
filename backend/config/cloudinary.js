const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
console.log("Cloudinary config check:", {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  secret_set: !!process.env.CLOUDINARY_API_SECRET,
});

const createUploader = (folder, resourceType = 'image') => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `travelsphere/${folder}`,
      resource_type: resourceType,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    },
  });
  return multer({ storage });
};

module.exports = { cloudinary, createUploader };