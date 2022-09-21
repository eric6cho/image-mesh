require('dotenv').config();
const express = require('express');
const Jimp = require('jimp');
const fs = require('fs');
const path = require('path');
const { getPaletteFromURL } = require('color-thief-node');
const app = express();

const port =  process.env.PORT || 5000;
const HOST = process.env.PORT ? 'https://image-mesh-server.herokuapp.com':'http://localhost:'+port;
const SERVERAPI = '/image-mesh/api';
const defaultMessage = 'API calls will use this path format:'+SERVERAPI+'. Example: '+SERVERAPI+'/get/params';

// start define server paths

app.use(express.json());

app.use(express.static(path.resolve(__dirname, '../public/'))); 

app.get('/', (req, res) => res.json({message:defaultMessage,}));

app.get(SERVERAPI, (req, res) => res.json({message:defaultMessage,}));

app.get(SERVERAPI+'/get/host', (req, res) => res.json({'url':HOST}));

app.get(SERVERAPI+'/get/params/',(req,res) => res.json(getParams()));

app.get(SERVERAPI+'/get/params/default',(req,res) => res.json(getParams(true)));

app.get(SERVERAPI+'/get/palette',(req,res) => 
  getPaletteData(url).then(data=>res.json(data)));

app.get(SERVERAPI+'/get/gradient',(req,res) => 
  getPaletteData(url).then(data=>res.json(data)));

app.get(SERVERAPI+'/get/image',(req,res) => 
  // getImageData(req,isDefaultParams,isPixelated,isMesh,isGradient)
  getImageData(req,true,false,false,false).then(data => res.json(data)));

app.get(SERVERAPI+'/get/image/pixelate',(req,res) => 
  // getImageData(req,isDefaultParams,isPixelated,isMesh,isGradient)
  getImageData(req,true,true,false,false).then(data => res.json(data)));

app.get(SERVERAPI+'/get/image/edited',(req,res) =>
  // getImageData(req,isDefaultParams,isPixelated,isMesh,isGradient)
  getImageData(req,false,false,false,false).then(data => res.json(data)));

app.get(SERVERAPI+'/get/image/pixelMesh',(req,res) =>
  // getImageData(req,isDefaultParams,isPixelated,isMesh,isGradient)
  getImageData(req,false,true,true,false).then(data => res.json(data)));

app.get(SERVERAPI+'/get/image/pixelGradient',(req,res) => 
  // getImageData(req,isDefaultParams,isPixelated,isMesh,isGradient)
  getImageData(req,false,false,true,true).then(data => res.json(data)));

app.listen(port, () => console.log("App is running on port " + port));

// end define server paths

const getAdjustedParams = (params,query) => {
  //params[item] = validateNum(item val in query, default item val from params, min val, max val)
  params['hue'] = validateNum(query.hue,params['hue'],-100,100);
  params['saturation'] = validateNum(query.saturation,params['saturation'],-100,100); 
  params['brightness'] = validateNum(query.brightness,params['brightness'],-100,100);
  params['contrast'] = validateNum(query.contrast,params['contrast'],-100,100);
  params['glitch'] = validateNum(query.glitch,params['glitch'],0,100);
  params['pixelation'] = validateNum(query.pixelation,params['pixelation'],0,100);

  //params[item] = validateBool(item val in query, default item val from params)
  params['isPixelated'] = validateBool(query.isPixelated,params['isPixelated']);
  params['isPixelated'] = params['isPixelated'] && params['pixelation']>0;

  return params;
}

const getImageData = async (req,isDefaultParams,isPixelated,isMesh,isGradient) => new Promise(resolve => {
  let url = validateURL(req.query.url); // check if url is empty
  let file = getRandomFileName(); // generate random filename with format: yyyy-mm-dd-minutes-8charstr.png
  let params = getParams(true); // set all filtering params to 0 by default
  
  if(!isDefaultParams) params = getAdjustedParams(getParams(),req.query); // if false, parse req.query 
  if(isPixelated) params['isPixelated'] = true; // if true, image will be pixelated by default
  if(isMesh) params['isMesh'] = true;  // if true, image will be turned into a pixel map
  if(isGradient) params['isGradient'] = true; // if true, image will be turned into a gradient
  
  if(!url) resolve({'message':'url is not valid'}); // return if url is not valid
  
  getImageFromURL(url).then(image => { // return jimp image from url
    
    clearOldFiles(); // clear files older than 10 minutes

    let imageFile = 'public/'+file; // image path on server
    let imageURL = HOST+'/'+file; // image url by host

    image = cropImageToSquare(image); // crop to square
    image = filterImage(image,params); // apply filters from params
    image = resizeImage(image,256); // resize to uniform size
    image = pixelateImage(image,params); // apply pixelation from params
    image.write(imageFile); // save edited image
    
    getPaletteData(imageURL).then(data=>{ // get palette of edited image from imageurl on host
          
      setImageMesh(image,imageFile,params,data['palette']); // apply image mesh from params and palette
  
      data['src'] = imageURL; // add src to data object
      data['params'] = params; // add params to data object

      resolve(data); // return data object
    });
  });
});

const setImageMesh = (image,file,params,palette) => { 
  if(!params['isMesh']) return; // return if isMesh is false

  image = resizeImage(image,6); // resize for scanning function below
  
  // iterate thru each pixel of resized image and apply new color
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) { 
    let randomIndex = Math.floor(Math.random() * palette.length); // choose randome palette index    
    let paletteColor = palette[randomIndex]; // get palette color
    this.bitmap.data[idx + 0] = paletteColor[0]; // set r
    this.bitmap.data[idx + 1] = paletteColor[1]; // set g
    this.bitmap.data[idx + 2] = paletteColor[2]; // set b
  });
  
  image = resizeImage(image,256); // resize to uniform size
  image = blurImage(image,params); // blur image
  image = pixelateImage(image,params); // apply pixelation from params
  image.write(file); // save edited image
};

const getParams = (isDefault) => ({ // get parameters for filtering images
  'hue':isDefault?0:5,
  'saturation':isDefault?0:20,
  'brightness':isDefault?0:0,
  'contrast':isDefault?0:-20,
  'glitch':isDefault?0:0,
  'pixelation':isDefault?0:16,
  'isPixelated':isDefault?false:true,
  'isMesh':false,
  'isGradient':false,
});

const getImageFromURL = async url => await Jimp.read(url); // get image object from url

const cropImageToSquare = image => {
  let w = image.bitmap.width; // image width
  let h = image.bitmap.height; // image height
  let squareSide = Math.min(w,h); // get smaller side of image
  return image.crop((w-squareSide)/2,(h-squareSide)/2,squareSide,squareSide); // crop to a square
};

const resizeImage = (image,newHeight) => {
  let ratio = image.bitmap.width/image.bitmap.height; // >1 if image is wide, <1 if the image is tall
  let newWidth = Math.floor(newHeight*ratio); // get new width from the new height and aspect ratio
  return image.resize(newWidth,newHeight,Jimp.RESIZE_BEZIER) // resize image to new dimensions
};

const pixelateImage = (image,params) => {
  if(!params['isPixelated']||params['isGradient']) return image; // return if image is not pixelated
  let pixelation = params['pixelation']!==0?params['pixelation']:16; // if pixelation is not set, use 16
  return image.pixelate(image.bitmap.height/pixelation); // pixelate image
}

const blurImage = (image,params) => {
  if(!params['isGradient']) return image; // return if image is not gradient
  return image.blur(20); // blur image
}

const filterImage = (image,params) =>{    
  let hue = params['hue'];
  let sat = params['saturation'];
  let gli = params['glitch'] * -1; // adjust value from [0,100] to [-100,0]
  let bri = params['brightness'];
  let con = params['contrast'] / 100; // adjust value from [-100,100] to [-1,1]
 
  let brightness = (bri>=0?'tint':'lighten') // tint and lighten work well for brightness depending on value
  
  image = image.color([{apply:'hue', params: [hue]}]);        // change hues of colors
  image = image.color([{apply:'saturate', params: [sat]}]);   // de/saturate colors
  image = image.color([{apply:'tint', params: [gli]}]);       // glitch colors
  image = image.color([{apply:brightness, params: [bri]}]);   // change brightness
  image = image.contrast(con);                                // change contrast

  return image;
};

const clearOldFiles = () => {
  let date = new Date();
  let public = './public/';
  
  fs.readdir(public, (err, files) => { // read public directory
    if (err) return console.log('Error: ' + err); // return if err
    
    files.forEach(file => { // read each file in public directory
      let segments = file.split('-'); // split file name yyyy-mm-dd-minutes-8charstr by '-' 
       
      const isFileValid = // false if file is named incorrectly and not from the past hour
        segments.length===5 && // incorrect file name format
        parseInt(segments[0])===date.getFullYear() && // file year != current year
        parseInt(segments[1])===date.getMonth()+1 && // file month != current month
        parseInt(segments[2])===date.getDate() && // file day != current day
        Math.abs(parseInt(segments[3])-(date.getMinutes()+date.getHours()*60))<10; 
        // file minutes - current minutes > 10 minutes

      if(!isFileValid) deleteFile(public+file); // if file is older than 10 minutes, then delete
    });
  });
};

const getPaletteData = async url => new Promise(resolve=>{
  url = validateURL(url); // check if url is empty
  if(!url) resolve({'message':'url is not valid'}); // return if empty 

  getPalette(url).then(palette=>{  // get palette of 8 colors
    let data = { // build data object
      'url':url, // source image url
      'palette':palette, // image palette
      'paletteStyles':getPaletteBackgroundStyles(palette), // css styles for palette
      'gradientStyle':getGradientBackgroundStyle(palette), // css style for gradient
    };

    resolve(data); // return data object
  });
});

const getPalette = async url => new Promise(resolve => 
  resolve(getPaletteFromURL(url,9))); // get palette of 8 colors from url

const getPaletteBackgroundStyles = palette => ( // css style of palette
  palette.map(color=>({'background':'rgb('+color.join(',')+')'})) 
);

const getGradientBackgroundStyle = palette => ( // css style of gradient
  {
    'background':
    'linear-gradient(90deg, '+
    'rgb('+palette[0].join(',')+') 0%, '+
    'rgb('+palette[1].join(',')+') 25%, '+
    'rgb('+palette[2].join(',')+') 75%, '+
    'rgb('+palette[3].join(',')+') 100%)'
  }
);

const validateNum = (val,defaultVal,minVal,maxVal) => {
  val = parseFloat(val); // get float from val
  if(isNaN(val))val=defaultVal; // if NaN, set default
  else if(val<minVal)val=minVal; // if val is outside of range, then assign range val
  else if(val>maxVal)val=maxVal;
  return val;
};

const validateBool = (val,defaultVal) => {
  if(typeof val!=="boolean") 
    val = val==='true'?true:(val==='false'?false:defaultVal); // assign bool val
  return val;
};

const deleteFile = path => {
  try {fs.unlinkSync(path);} 
  catch(err) {console.error(err);}
};

const validateURL = url => url.trim().length===0 ? null : url.trim();

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

/*
  NOTES ON FILTERING IMAGES

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