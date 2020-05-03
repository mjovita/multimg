
let mainImg; // Declare variable 'img'.
let canvasWidth = 1000;
let canvasHeight = 600;

let smaller;
// let sc = 3;

//scale of source images
let sc = 6;


let w;
let h;

console.log("SKETCH!");


function pxlRGB(img,x,y){
  img.loadPixels();
  let pxl = [];
  var index = (x+y*img.width) * 4;

  pxl = [
  img.pixels[index+0],
  img.pixels[index+1],
  img.pixels[index+2],
  img.pixels[index+3]
 ];

 return pxl;
}//pxlRGB


function rgbSQR(a,b){
  let closest = 0;
  let d = 0;
  let prev = 0;

  let xred   = a[0],
      xgreen = a[1],
      xblue  = a[2],
      xalp   = a[3];

  let yred   = b[0],
      ygreen = b[1],
      yblue  = b[2],
      yalp   = b[3];


  if(a.length != b.length){
    console.log("input musts be .jpg RGBA lists");
  }
  else{ //calculate

    prev = d;
    let reds = Math.pow((yred - xred),2),
        greens = Math.pow((ygreen - xgreen),2),
        blues = Math.pow((yblue - xblue),2);

    d = Math.sqrt(reds + greens + blues);
    return d;

  } //else

} //rgbSQR



//pixel to img: return the ID of img whose avg is closest to pixel
const pixelToImg = async (c, db) => {
  //console.log(hue);
  let closest = 0,
      lowest = 0,
      d = 0,
      prev = 0;
      pathOfClosest = "";

  if(localStorage.getItem(c) !== null){
    //console.log('localStorage exists');
    let jsonClosest = JSON.parse(localStorage.getItem(c));
    return [jsonClosest[0], jsonClosest[1]];

  } else{
    //find closest
    console.log('for loop else');
    for(item of db){
      //console.log(item.imgRGBA);
      prev = d;
      d = rgbSQR(c, item.imgRGBA);
      if(d <= lowest || prev == 0){
        lowest = d;
        //console.log("lowest: "+lowest);
        closest = item.imgID;
        pathOfClosest = item.imgPath.substring(9); //recorrect path


      }
      //console.log(d);
    }

  }// else


  //if d is lesser than given value, save it in localStorage
  if(lowest > 0 && lowest <= 30 ){
    localStorage.setItem(c, JSON.stringify([closest, pathOfClosest]));
  }



  return [closest, pathOfClosest];


} //pixelToImg



// async function timer(ms){
//   return new Promise(function(resolve){
//     setTimeout(resolve, ms);
//   });
// }

//---------

//grab data from server
const getData = async (r, h) =>{

  //if hue parameter present, return documents connected to hue value
  if(typeof h !== 'undefined'){
    let hdata = {'hue':h};
    const options = {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(hdata)
    };

    const response = await fetch(r, options);
    const docs = await response.json();

    return([docs, h]);
  }


  const response = await fetch(r);
  const data = await response.json();
  return data;
} //getData

//load imgs from database
const init = async () => {
  let route = '/photomosaic';
  let imgDatabase = await getData(route); //database fetched from server

  imgDatabase.sort(function(a,b){
    return a.imgID - b.imgID;
  });

  return imgDatabase;

} //init


function preload(){


  // Load the main image
  console.log("PRELOAD");
  mainImg = loadImage('main/mimg.jpg');

} //preload


function setup() {
  console.log("SETUP");


  //center canvas
  createCanvas(canvasWidth, canvasHeight).center('horizontal');

  mainImg.resize(1000, 600);

  w = int(mainImg.width / sc);
  h = int(mainImg.height / sc);


  smaller = createImage(w,h);
  smaller.copy(mainImg, 0, 0, mainImg.width, mainImg.height, 0, 0, w, h);



}// setup


function draw() {
  console.log("DRAW");
  background(0);
  smaller.loadPixels();
  let centerx = canvasWidth / 2 - mainImg.width / 2;
  let imgIndexArr = []; //index location of chosen images
  let imgsMissed = new Map(); //contain (x,y) and index location of image
  let m = 0;  //missed values--important to put outside LoadImage function
  let savedImages = [];


  function LoadImage(index, path, arr, missed, y, x){
    return new Promise(function(resolve){

      if(!arr.includes(index)){

        loadImage(path, function(img){
          //save chosen images
          savedImages[index] = img;
          image(img, x*sc+centerx, y*sc, sc, sc);
          resolve();
        });

        arr.push(index);
      } else{
        m++;


        missed.set(m,[y,x,index]);


      }

    });
  } //LoadImage




  const asynchronous_programming = async () =>{

    let imgDatabase = await init();
    console.log(`height: ${h}`);
    console.log(`width: ${w}`);

    for(let y = 0;y < h;y++){
      for(let x = 0;x < w;x++){
        let c = pxlRGB(smaller,x,y);

        let [red, blue, green, alph] = c;
        let newRed = Math.ceil(red/10)*10;
        let newGreen = Math.ceil(green/10)*10;
        let newBlue = Math.ceil(blue/10)*10;

        let roundedRGB = [newRed, newGreen, newBlue, 255];

        let [imgIndex, imgPath] = await pixelToImg(roundedRGB, imgDatabase);


        LoadImage(imgIndex, imgPath, imgIndexArr, imgsMissed, y, x).then(() => {

          for(let [key, value] of imgsMissed.entries()){
            //x and y and index values
            let y = value[0];
            let x = value[1];
            let i = value[2];

            image(savedImages[i], x*sc+centerx, y*sc, sc, sc );
          }

        })
        .catch((err)=>{
          console.log('Some error: usually asynchronous delayed images');
          console.log(err);
          return;
        });


      } //for x
    } //for y

  } //asynchronous_programming

  asynchronous_programming();


  noLoop();

} // draw
