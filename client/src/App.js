
import React, { useState, useEffect, useRef } from "react";
import './styles/main.scss';

  const getSampleLinks = () => [
    'https://i.scdn.co/image/ab6761610000e5eb6ccb967cecc6f1da90fe355e',
    'https://i.scdn.co/image/ab6761610000e5eb7da39dea0a72f581535fb11f',
    'https://i.scdn.co/image/ab6761610000e5ebd969cf117d0b0d4424bebdc5',
    'https://i.scdn.co/image/ab6761610000e5eb74855e013588fd276b25b337',
    'https://i.scdn.co/image/ab6761610000e5eb8f0270ec23a53f3c1fe91849',
    'https://i.scdn.co/image/ab6761610000e5ebb4c956981d00ad66e06792fa',
    'https://i.scdn.co/image/ab6761610000e5ebd7c88b3403c3dba1dbcfaf92',
    'https://i.scdn.co/image/ab6761610000e5eb8fcf922b8900b89a50575cc5',
  ];

export default function App() {

  const [sampleURLs] = useState(getSampleLinks()); 
  const [recentURLs,setRecentURLs] = useState([]); 

  const [imageURL,setImageURL] = useState(''); 
  const [isURLValid,setIsURLValid] = useState(true);

  const [imageSrc,setImageSrc] = useState(null);
  const [imageHue,setImageHue] = useState(0);
  const [imageSaturation,setImageSaturation] = useState(0);
  const [imageBrightness,setImageBrightness] = useState(0);
  const [imageContrast,setImageContrast] = useState(0);
  const [imagePixelation,setImagePixelation] = useState(0);
  const [imageIsPixelated,setImageIsPixelated] = useState(false);
  const [imageIsSquare,setImageIsSquare] = useState(false);

  useEffect(()=>{
   
    let initialURL = sampleURLs[0];

    setDefaultParams();

    setImageURL(initialURL);

    document.getElementById('inputURL').value = initialURL;

    let imagePreview = document.getElementById('image-preview');
    imagePreview.onerror = () => setIsURLValid(false);
    imagePreview.onload = () => setIsURLValid(true);

  },[]);
  
 const setDefaultParams = () => {
    let apiURL ='/get/params/';

    fetchGet(apiURL).then(data=>{      
      setImageHue(data['hue']);
      setImageSaturation(data['saturation']);
      setImageContrast(data['contrast']*100);
      setImageBrightness(data['brightness']);
      setImagePixelation(data['pixelation']);
      setImageIsPixelated(data['isPixelated']);
      setImageIsSquare(data['isSquare']);
      
      document.getElementById('inputHue').value = data['hue'];
      document.getElementById('inputSaturation').value = data['saturation'];
      document.getElementById('inputContrast').value = data['contrast']*100;
      document.getElementById('inputBrightness').value = data['brightness'];
      document.getElementById('inputPixelation').value = data['pixelation'];
      document.getElementById('inputIsPixelated').checked = data['isPixelated'];
      document.getElementById('inputIsSquare').checked = data['isSquare'];
    });
  };

  const setInputVal = (key,val) => {
    if(key==='Hue')setImageHue(val);
    if(key==='Saturation')setImageSaturation(val);
    if(key==='Brightness')setImageBrightness(val);
    if(key==='Contrast')setImageContrast(val);
    if(key==='Pixelation')setImagePixelation(val);
  };

  const fetchGet = async (url) => new Promise (resolve =>
    fetch(url).then(res => res.json()).then(data => resolve(data))
  );

  const setImage = src => {
    setImageSrc(src);
    var img = document.getElementById('image-target');
    img.src = src;
  };

  const getUneditedImage = () => {
    if(!isURLValid) return;
    
    if(!recentURLs.includes(imageURL))setRecentURLs([...recentURLs, imageURL]);
    
    let qURL = encodeURIComponent(imageURL);
    let apiURL ='/get/image/?&url='+qURL;

    fetchGet(apiURL).then(data=>setImage(data['src']));
  };

  const getSquareImage = () => {
    if(!isURLValid) return;
    
    if(!recentURLs.includes(imageURL))setRecentURLs([...recentURLs, imageURL]);
    
    let qURL = encodeURIComponent(imageURL);
    let apiURL ='/get/image/square/?&url='+qURL;

    fetchGet(apiURL).then(data=>setImage(data['src']));
  };

  const getPixelatedImage = () => {
    if(!isURLValid) return;

    if(!recentURLs.includes(imageURL))setRecentURLs([...recentURLs, imageURL]);
    
    let qURL = encodeURIComponent(imageURL);
    let apiURL ='/get/image/pixelate/?&url='+qURL;

    fetchGet(apiURL).then(data=>setImage(data['src']));
  };

  const getDefaultEditedImage = () => {
    if(!isURLValid) return;

    if(!recentURLs.includes(imageURL))setRecentURLs([...recentURLs, imageURL]);

    let adjustedContrast = imageContrast/100; // contrast is from -1 to 1
    let qURL = encodeURIComponent(imageURL);
    let qHue = encodeURIComponent(imageHue);
    let qSaturation = encodeURIComponent(imageSaturation);
    let qBrightness = encodeURIComponent(imageBrightness);
    let qContrast = encodeURIComponent(adjustedContrast);
    let qPixelation = encodeURIComponent(imagePixelation);
    let qIsPixelated = encodeURIComponent(imageIsPixelated);
    let qIsSquare = encodeURIComponent(imageIsSquare);
    let apiURL =
      '/get/image/edited/?&url='+qURL+'&hue='+qHue+'&saturation='+qSaturation+
      '&brightness='+qBrightness+'&contrast='+qContrast+'&pixelation='+
      qPixelation+'&isPixelated='+qIsPixelated+'&isSquare='+qIsSquare;

    fetchGet(apiURL).then(data=>setImage(data['src']));
  };

  return (
    <div className="App">  
      <div className="title-section">
        <h1>Image Mesh</h1>
        <p>Used to edit photos and create pixel art</p>
      </div>
      <div className="top-section">
        <div className="input-section">
          <div className="form-section">
            <div className="form-header">
              <h2>Edit Picture</h2>
              {!isURLValid&&<p className="error-text">The URL below is not a valid image address</p>}
            </div>
            <div className="form-section-inner">
              <div className="form-input">
                <span className="material-icons">launch</span>
                <p className="form-input-header">Image URL:</p>
                <input type="text" id='inputURL' onChange={e=>setImageURL(e.target.value)}/>
              </div>
              <div className="form-input">
                <span className="material-icons">invert_colors</span>
                <p className="form-input-header">Hue (-100,100):</p>
                <input type='number' min='-100' max='100' id='inputHue' onChange={e=>setInputVal('Hue',e.target.value)}/>
              </div>
              <div className="form-input">
                <span className="material-icons">tonality</span>
                <p className="form-input-header">Saturation (-100,100):</p>
                <input type='number' min='-100' max='100' id='inputSaturation' onChange={e=>setInputVal('Saturation',e.target.value,-100,100)}/>
              </div>
              <div className="form-input">
                <span className="material-icons">light_mode</span>
                <p className="form-input-header">Brightness (-100,100):</p>
                <input type='number' min='-100' max='100' id='inputBrightness' onChange={e=>setInputVal('Brightness',e.target.value,-100,100)}/>
              </div>
              <div className="form-input">
                <span className="material-icons">contrast</span>
                <p className="form-input-header">Contrast (-100,100):</p>
                <input type='number' min='-100' max='100' id='inputContrast' onChange={e=>setInputVal('Contrast',e.target.value,-100,100)}/>
              </div>
              <div className="form-input">
                <span className="material-icons">deblur</span>
                <p className="form-input-header">Pixelation (0,100):</p>
                <input type='number' min='0' max='100' id='inputPixelation' onChange={e=>setInputVal('Pixelation',e.target.value,0,100)}/>
              </div>
              <div className="checkbox-section">
                <div className="form-input">
                  <span className="material-icons">blur_on</span>
                  <p className="form-input-header">Pixelate:</p>
                  <input type="checkbox" id='inputIsPixelated' checked={imageIsPixelated} onChange={e=>setImageIsPixelated(e.target.checked)}/>
                </div>
                <div className="form-input">
                  <span className="material-icons">crop_free</span>
                  <p className="form-input-header">Crop Square:</p>
                  <input type="checkbox" id='inputIsSquare' checked={imageIsSquare} onChange={e=>setImageIsSquare(e.target.checked)}/>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={'image-target '+(!imageSrc?'no-image':'')}>
          <img id='image-target' className={!imageSrc?'no-image':''} alt='edited'/>
        </div>
      </div>
      <div className="preview-section">
        <div className="preview-bar">
          <div className="image-preview">
            <img id='image-preview' className={isURLValid?'':'no-image'} alt='preview' src={imageURL}/>
          </div>
          <div className="text-preview">
            <span className="material-icons">invert_colors</span>
            <p>{imageHue}</p>
          </div>
          <div className="text-preview">
            <span className="material-icons">tonality</span>
            <p>{imageSaturation}</p>
          </div>
          <div className="text-preview">
            <span className="material-icons">light_mode</span>
            <p>{imageBrightness}</p>
          </div>
          <div className="text-preview">
            <span className="material-icons">contrast</span>
            <p>{imageContrast}</p>
          </div>
          <div className="text-preview">
            <span className="material-icons">deblur</span>
            <p>{imagePixelation}</p>
          </div>
          <div className="text-preview">
            <span className="material-icons">blur_on</span>
            <p>{imageIsPixelated?'on':'off'}</p>
          </div>
          <div className="text-preview">
            <span className="material-icons">crop_free</span>
            <p>{imageIsSquare?'on':'off'}</p>            
          </div>
          <div className="reset-button" onClick={()=>setDefaultParams()}>Reset Settings</div>
        </div>
      </div>
      <div className="submit-section">
        <div className={"submit-button "+(isURLValid?'':'disabled')} onClick={()=>getUneditedImage()}>Get Image</div>
        <div className={"submit-button "+(isURLValid?'':'disabled')} onClick={()=>getSquareImage()}>Crop Image</div>
        <div className={"submit-button "+(isURLValid?'':'disabled')} onClick={()=>getPixelatedImage()}>Pixelate Image</div>
        <div className={"submit-button "+(isURLValid?'':'disabled')} onClick={()=>getDefaultEditedImage()}>Edit Image</div>
      </div>
      <div className="bottom-section">
        <div className="title-section">
          <h2>Links</h2>
          <p>Select an image link below to fill the url input in the form above</p>
        </div>
        <div className="link-section">
          <div className="link-list-container">
            <h3>Recent Image Links</h3>
            <div className="link-list recent">
              {recentURLs.map((url,i)=><div key={i} className='button link-button' onClick={()=>setImageURL(url)}><img src={url} alt={'icon'}/><p>{url}</p></div>)}
            </div>
          </div>
          <div className="link-list-container">
            <h3>Sample Image Links</h3>
            <div className="link-list">
              {sampleURLs.map((url,i)=><div key={i} className='button link-button' onClick={()=>setImageURL(url)}><p>{url}</p></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// separate into sub components, code cleanup, stylesheet cleanup, mobile styling, console cleanup