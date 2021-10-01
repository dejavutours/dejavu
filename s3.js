const fs = require("fs");
const S3 = require("aws-sdk/clients/s3");

const bucketName = process.env.AWS_BUCKET
const region = process.env.AWS_REGION
const accessKeyId = process.env.AWS_ACCESS_KEY
const secretAccessKey = process.env.AWS_SECERET_ACCESS_KEY

const s3 = new S3({ 
     region,
     accessKeyId,
     secretAccessKey
});

//upload files to gallery
 function uploadFile(file) {
     console.log(file);
    const fileStream = fs.createReadStream(file.path)

    const uploadParams = {
        Bucket: bucketName,
        Body: fileStream,
        Key: 'gallery/' +  file.filename
    }

    return s3.upload(uploadParams).promise()
}
exports.uploadFile = uploadFile

//upload files to proof
function uploadFileProof(file) {
    console.log(file);
   const fileStream = fs.createReadStream(file.path)

   const uploadParams = {
       Bucket: bucketName,
       Body: fileStream,
       Key: 'proofs/' +  file.filename
   }

   return s3.upload(uploadParams).promise()
}
exports.uploadFileProof = uploadFileProof

//download File
function getFileStream(fileName) {

    const downloadParams = {
        Key: 'proofs/' + fileName,
        Bucket: bucketName,
    }

    return s3.getObject(downloadParams).createReadStream()

}
exports.getFileStream = getFileStream

//delete files from gallery
function DeleteFileGallery(fileName) {

    const deleteParams = {
        Key: 'gallery/' + fileName,
        Bucket: bucketName,
    }

    return s3.deleteObject(deleteParams).promise()

}
exports.DeleteFileGallery = DeleteFileGallery

//delete files from proofs
function DeleteFileProofs(fileName) {

    const deleteproofparams = {
        Key: 'proofs/' + fileName,
        Bucket: bucketName,
    }

    return s3.deleteObject(deleteproofparams).promise()

}
exports.DeleteFileProofs = DeleteFileProofs
 



