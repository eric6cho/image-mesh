require('dotenv').config();
const express = require('express');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const app = express();
const port =  process.env.PORT || 8888;
const serverPath = 'http://localhost:'+port+'/'; // possibly change
//const serverPath = (process.env.HOST||('http://localhost:'+port))+'/'; // possibly change

app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../client/build'))); 

const validateNum = (val,defaultVal,minVal,maxVal) => {
  val = parseFloat(val);
  if(isNaN(val))val=defaultVal;
  else if(val<minVal)val=minVal;
  else if(val>maxVal)val=maxVal;
  return val;
};

const validateBool = (val,defaultVal) => {
  if(typeof val!=="boolean")
    val = val==='true'?true:(val==='false'?false:defaultVal);
  return val;
};

const validateURL = url => url.trim().length===0 ? null : url.trim();

const getImageData = async (url,file,params) => new Promise(resolve => 
  getImageFromURL(url).then(image => {
    clearOldFiles();

    if(params['isSquare']) image = cropImageToSquare(image);
    if(params['isPixelated']) image = resizeImage(image,32);
    if(params['isFilter']) image = filterImage(image,params);

    image = resizeImage(image,256);

    if(params['isPixelated']) image = pixelateImage(image,params);
    
    writeImageToFile(image,'public/'+file);

    const data = {
      'url':url,
      'src':serverPath+file,
      'file':file,
    };

    resolve(data);
  })
);

const getParams = () => ({
  'hue':5,
  'saturation':20,
  'brightness':0,
  'contrast':-0.2,
  'pixelation':16,
  'isPixelated':true,
  'isSquare':true,
  'isFilter':true,
});

const getImageFromURL = async url => await Jimp.read(url);

const cropImageToSquare = image => {
  let w = image.bitmap.width;
  let h = image.bitmap.height;
  let squareSide = Math.min(w,h);
  return image.crop((w-squareSide)/2,(h-squareSide)/2,squareSide,squareSide);
};

const resizeImage = (image,newHeight) => {
  let ratio = image.bitmap.width/image.bitmap.height; // >1 if image is wide, <1 if the image is tall
  let newWidth = Math.floor(newHeight*ratio);
  return image.resize(newWidth,newHeight,Jimp.RESIZE_BEZIER)
};

const pixelateImage = (image,params) => 
  image.pixelate(image.bitmap.height/params['pixelation']);

const filterImage = (image,params) =>
  image = image
    .color([{apply:'hue', params: [params['hue']]}])
    .color([{apply:'saturate', params: [params['saturation']]}])
    .color([{apply:'tint', params: [params['brightness']]}])
    .contrast(params['contrast']);

const writeImageToFile = (image,path) => image.write(path);

const deleteFile = path => {
  try {fs.unlinkSync(path);} 
  catch(err) {console.error(err);}
};

const clearOldFiles = () => {
  let date = new Date();
  let year = date.getFullYear();
  let month = date.getMonth()+1;
  let day = date.getDate(); 
  let minutes = date.getMinutes() + date.getHours()*60;
  let publicPath = './public/';
  fs.readdir(publicPath, (err, files) => {
    if (err) return console.log('Error: ' + err);
    
    files.forEach(file => {
      let nameSegments = file.split('-'); 
       
      const fileValidation = // false if file is named incorrectly and not from the past hour
        nameSegments.length===5 && // incorrect file name format
        parseInt(nameSegments[0])===year && // file year != current year
        parseInt(nameSegments[1])===month && // file month != current month
        parseInt(nameSegments[2])===day && // file day != current day
        Math.abs(parseInt(nameSegments[3])-minutes)<10; // file minutes - current minutes > 10 minutes

      if(!fileValidation) deleteFile(publicPath+file);    
    });
  });
};

const getRandomFileName = (length=8) => {
  let str = '';
  let fileType = '.png';
  let s = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i=0; i<length; i++) 
    str += s.charAt(Math.floor(Math.random()*s.length));
  return formatDate(new Date())+'-'+str+fileType;    
};

const formatDate = date => {
  let year = date.getFullYear();
  let month = date.getMonth()+1;
  let day = date.getDate();
  let minutes = date.getMinutes() + date.getHours()*60;
  return [year,month,day,minutes].join('-');
};

app.use(express.static('public'));

app.get('/', (req, res) => res.json({message:'This one doesnt return anything. Try something else',}));

app.get('/get/params/',(req,res) => res.json(getParams()));

app.get('/get/image',(req,res) => {
  let url = validateURL(req.query.url);
  let file = getRandomFileName();
  let params = getParams();

  if(!url) res.json({'message':'url is not valid'});

  params['isPixelated'] = false;
  params['isSquare'] = false;
  params['isFilter'] = false;

  getImageData(url,file,params).then(data => res.json(data));
});

app.get('/get/image/square',(req,res) => {
  let url = validateURL(req.query.url);
  let file = getRandomFileName();
  let params = getParams();

  if(!url) res.json({'message':'url is not valid'});

  params['isPixelated'] = false;
  params['isFilter'] = false;

  getImageData(url,file,params).then(data => res.json(data));
});

app.get('/get/image/pixelate',(req,res) => {
  let url = validateURL(req.query.url);
  let file = getRandomFileName();
  let params = getParams();

  if(!url) res.json({'message':'url is not valid'});

  params['isFilter'] = false;

  getImageData(url,file,params).then(data => res.json(data));
});

app.get('/get/image/edited',(req,res)=>{
  let url = validateURL(req.query.url);
  let file = getRandomFileName();
  let params = getParams();

  if(!url) res.json({'message':'url is not valid'});

  params['hue'] = validateNum(req.query.hue,params['hue'],-100,100);
  params['saturation'] = validateNum(req.query.saturation,params['saturation'],-100,100);
  params['brightness'] = validateNum(req.query.brightness,params['brightness'],-100,100);
  params['contrast'] = validateNum(req.query.contrast,params['contrast'],-1,1);
  params['pixelation'] = validateNum(req.query.pixelation,params['pixelation'],0,100);
  params['isSquare'] = validateBool(req.query.isSquare,params['isSquare']);
  params['isPixelated'] = validateBool(req.query.isPixelated,params['isPixelated']);
  params['isPixelated'] = params['isPixelated'] && params['pixelation']>0;

  getImageData(url,file,params).then(data => res.json(data));
});

app.listen(port, () => console.log("App is running on port " + port));