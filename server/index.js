require('dotenv').config();
const express = require('express');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const app = express();
const port =  process.env.PORT || 5000;
const SERVERAPI = '/image-mesh/api';

app.use(express.json());

app.use(express.static(path.resolve(__dirname, '../public/'))); 

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
      'src':'/'+file,
      'file':file,
    };

    resolve(data);
  })
);

const getParams = () => ({
  'hue':5,
  'saturation':20,
  'brightness':0,
  'contrast':-20,
  'glitch':0,
  'pixelation':16,
  'isPixelated':true,
  'isSquare':true,
  'isFilter':true,
});

const adjustParamGlitch = val => val*-1;

const adjustParamContrast = val => val/100;

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

const filterImage = (image,params) =>{    
  /*
    NOTES

    HUE: Spin the hue by a given amount
    x!=0: spin hue as expected

    TINT: apply mix with white color
    x>0: lighten image but also adds white. Use this for brightness param when >0
    x<0: destroys the colors of the image. Use this for glitch param

    LIGHTEN: lightens the color of the image by a given amount
    x>0: makes the image lighter but worse than tint. Use TINT instead
    x<0: darkens image. Use this for brightness param when <0

    SATURATE: saturate color by a given amount
    x>0: increases saturation as expected
    x<0: decrease saturation as expected

    CONTRAST: increase/decrease contrast of color
    x>0: increase contrast as expected
    x<0: decrease contrast as expected
  */
 
  let hue = params['hue'];
  let sat = params['saturation'];
  let gli = adjustParamGlitch(params['glitch']);
  let bri = params['brightness'];
  let con = adjustParamContrast(params['contrast']);

  let brightness = (bri>=0?'tint':'lighten') // tint and lighten work well for birghtness depending on value
  
  image = image.color([{apply:'hue', params: [hue]}]);        // change hues of colors
  image = image.color([{apply:'saturate', params: [sat]}]);   // de/saturate colors
  image = image.color([{apply:'tint', params: [gli]}]);       // glitch colors
  image = image.color([{apply:brightness, params: [bri]}]);   // change brightness
  image = image.contrast(con);                                // change contrast

  return image;
};

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

const defaultMessage = 'API calls will use this path format:'+SERVERAPI+'. Example: '+SERVERAPI+'/get/params';

app.get('/', (req, res) => res.json({message:defaultMessage,}));

app.get(SERVERAPI, (req, res) => res.json({message:defaultMessage,}));

app.get(SERVERAPI+'/get/params/',(req,res) => res.json(getParams()));

app.get(SERVERAPI+'/get/image',(req,res) => {
  let url = validateURL(req.query.url);
  let file = getRandomFileName();
  let params = getParams();

  if(!url) res.json({'message':'url is not valid'});

  params['isPixelated'] = false;
  params['isSquare'] = false;
  params['isFilter'] = false;

  getImageData(url,file,params).then(data => res.json(data));
});

app.get(SERVERAPI+'/get/image/square',(req,res) => {
  let url = validateURL(req.query.url);
  let file = getRandomFileName();
  let params = getParams();

  if(!url) res.json({'message':'url is not valid'});

  params['isPixelated'] = false;
  params['isFilter'] = false;

  getImageData(url,file,params).then(data => res.json(data));
});

app.get(SERVERAPI+'/get/image/pixelate',(req,res) => {
  let url = validateURL(req.query.url);
  let file = getRandomFileName();
  let params = getParams();

  if(!url) res.json({'message':'url is not valid'});

  params['isFilter'] = false;

  getImageData(url,file,params).then(data => res.json(data));
});

app.get(SERVERAPI+'/get/image/edited',(req,res)=>{
  let url = validateURL(req.query.url);
  let file = getRandomFileName();
  let params = getParams();

  if(!url) res.json({'message':'url is not valid'});

  params['hue'] = validateNum(req.query.hue,params['hue'],-100,100);
  params['saturation'] = validateNum(req.query.saturation,params['saturation'],-100,100);
  params['brightness'] = validateNum(req.query.brightness,params['brightness'],-100,100);
  params['contrast'] = validateNum(req.query.contrast,params['contrast'],-100,100);
  params['glitch'] = validateNum(req.query.glitch,params['glitch'],0,100);
  params['pixelation'] = validateNum(req.query.pixelation,params['pixelation'],0,100);
  params['isSquare'] = validateBool(req.query.isSquare,params['isSquare']);
  params['isPixelated'] = validateBool(req.query.isPixelated,params['isPixelated']);
  params['isPixelated'] = params['isPixelated'] && params['pixelation']>0;

  getImageData(url,file,params).then(data => res.json(data));
});

app.listen(port, () => console.log("App is running on port " + port));