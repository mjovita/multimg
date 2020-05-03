var convert = require('color-convert');
//clean code (remove console.logs etc.)

//--------------------------------------below original code
const express = require('express');
const ejs = require('ejs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const util = require('util');
const DataStore = require('nedb');

console.log("SERVER!");


const average = require('image-average-color');

const app = express();
const port = process.env.PORT || 4000;

var bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

const db = new DataStore('database.db');
db.loadDatabase();


app.use(express.static('uploads'));
app.use(expressLayouts);
app.set('view engine', 'ejs');





var dir = "./uploads";
var maindir = dir + '/main';
let addedImages = [];
let count = 0;



var storage = multer.diskStorage({
  destination: async function(req, file, cb){


    if(!fs.existsSync(dir)){
      fs.mkdirSync(dir);
    }


    if(file.fieldname === 'file'){
      console.log('###### FILE #######');

      return cb(null, maindir);
    }


    if(file.fieldname === 'files'){
      console.log('###### FILESSS #######');

      file.mimetype = 'image/jpg';

      return cb(null, dir);
    }

    cb(new Error('Unknown fieldname: ' + file.fieldname));

  },

  filename: function(req, file, cb){

    if(file.fieldname === 'file'){
      console.log('###### FILE-NAME #######');

      fs.rename(maindir+'/'+'mimg.jpg', maindir+'/'+file.originalname, function(err){
        if(err) throw err;
        console.log('File renamed');
        file.mimetype = 'image/jpg';
        cb(null, "mimg.jpg");
      });


      //console.log(file.originalname);


    }

    if(file.fieldname === 'files'){
      console.log('###### FILE-NAMESSS #######');
      //multiple images
      addedImages[count] = file.originalname

      count++;
      cb(null, file.originalname);

    }



  }


}); //storage


//make readdir await
const readdir = util.promisify(fs.readdir);

//read files (excluding folders) synchronously
async function readFiles(directory){
  const dirents = await readdir(directory, {withFileTypes: true});
  const fileNames = dirents.filter(dirent => !dirent.isDirectory()).map(dirent => dirent.name);
  return fileNames;

}//readFiles

//delete files in sync on given folder
async function deleteFiles(directory){

  readFiles(directory).then(function(fileNames){
    if(!fileNames.length == 0){
      for(const file of fileNames){
        fs.unlink(path.join(directory, file), err=>{
          if(err) throw err;
        });
      }
    }

  }).catch((err)=>{
    console.log(err);
  });

} // deleteFiles

//calculate avg rgba per image
async function avgRGBA_per_image(path, length){
  var hue = 0;

  average(path, length,  async (err, color, path, id, hue)=>{

    if(err){
      console.log('some error');
      return;
    }
    console.log(color);
    var [red, green, blue, alpha] = color;
    var newRed = Math.ceil(red/10)*10;
    var newGreen = Math.ceil(green/10)*10;
    var newBlue = Math.ceil(blue/10)*10;

    //calculate hue
    var roundedRGB = [newRed, newGreen, newBlue, 255];
    var roundedHSL = convert.rgb.hsl(roundedRGB);
    hue = roundedHSL[0];

    db.insert({"imgPath":path, "imgRGBA":roundedRGB, "imgID":id, "imgHue":hue}, function(err, newDoc){
      if(err) console.log(err);
    });

  });



}//avgRGBA_per_image



var upload = multer({storage: storage});


//establish routes
app.post('/uploads', upload.fields([{name: 'file', maxCount: 1}, {name: 'files', maxCount: 1000}]), function(req, res) {
    console.log('/uploads post');


    db.count({}, function(err, count){
      let databaseLength = count;
      for(let i = 0;i < addedImages.length;i++){
        let imgPath = (dir+'/'+addedImages[i]);
        db.findOne({imgPath: imgPath}, function(err, doc){
          //image already in database
          if(doc != null){
            console.log("findone: "+doc.imgPath);
            console.log("image already in database");
            return;
          }

          //new image
          avgRGBA_per_image(imgPath, databaseLength);
          databaseLength++;

        });
      }


    });


    res.render('uploadpage');
});

app.post('/sketch', upload.fields([{name: 'file', maxCount: 1}, {name: 'files', maxCount: 1000}]), function(req, res){
    res.send(file.originalname);
});






app.post('/photomosaic', (req, res)=>{
  console.log("/photomosaic post");
  console.log(req.body);
  res.json('hello from photomosaic post');

});

app.get('/photomosaic', (req, res)=>{

  db.find({},(err, data)=>{
    if(err){
      response.end();
      return;
    }
    res.json(data);
  });

});

app.post('/hues', (req,res)=>{
  console.log('inside /hues');
  let data = req.body;
  let hueToSearch = data.hue;

  console.log('before db find');
  db.find({'imgHue': hueToSearch}, function(err,docs){
    console.log('called');
    res.json(docs);
  });
});



app.get('/', (req, res) => {
  //data.count = uplLength;
  //set everything to zero
  deleteFiles(maindir);
  //reset counter
  count = 0;
  //uplLength = 0;
  res.render('index');

});





app.listen(port);
