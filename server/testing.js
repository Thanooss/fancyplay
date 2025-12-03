var http = require('http');
let fs=require('fs');
const server = http.createServer(function (req, res) {
    fs.appendFile('demofile1.html', 'Hello content!', function (err) {
        if (err) throw err;
        console.log('Saved!');
        res.appendFile(file)
        return res.end();
      });
  if(req.url=='/greet'){
    fs.readFile('demofile1.html', function(err, data) {
        if(err){
            res.writeHead(500,{'content-type' :'text/html'});
            console.log('internal server error'+err.message)
            res.write('internal server error'+err.message)
            return res.end();
        }
        else{
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.write(data);
    return res.end()
        }
    }
        )
    
        }

});



server.listen(8081,()=>{
    console.log("Server is running on port 8080");
});

