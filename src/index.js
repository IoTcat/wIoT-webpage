const PORT = 80;
const KEY = 'abcde';
const PATH_LENGTH = 4;


const express = require(`express`);
const md5 = require('md5');
const fs = require('fs');
const app = express();

const crypto = require('crypto');
let aes = {};
aes.encrypt = function(key, data) {
  const cipher = crypto.createCipher('aes192', key);
  var crypted = cipher.update(data, 'utf8', 'hex');
  crypted += cipher.final('hex');
  return crypted;
}

aes.decrypt = function(key, encrypted) {
  const decipher = crypto.createDecipher('aes192', key);
  var decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}


app.listen(PORT, () => {
	console.log(`wIoT-webpage server running at port ${PORT}`);
});


let list = {};


app.use((req, res) => {
	const pathname = req._parsedUrl.pathname;

	//homepage
	if(pathname == '/'){
		res.setHeader('Content-Type', 'text/html')
		res.send(fs.readFileSync(__dirname+'/index.html'));
		return;
	}


	//API
	if(pathname == '/GETKEY'){
		const path = '/'+md5(Math.random()).substring(0, PATH_LENGTH);

		res.send({
			path: path,
			key: aes.encrypt(KEY, path)
		});
		return;
	}
	if(pathname == '/GET' && req.query.hasOwnProperty('path') && list.hasOwnProperty(req.query.path)){
		s = `<script>key='${aes.encrypt(KEY, req.query.path)}'</script>`;
		s += render(list[req.query.path].template, list[req.query.path].data);
		res.send(s);
		return;
	}
	if(pathname == '/SET'){
		if(!req.query.hasOwnProperty('key') || !req.query.hasOwnProperty('template')){
			res.status(500).send('Illegal params!');
			return;
		}
		const path = aes.decrypt(KEY, req.query.key);
		if(path.length !== PATH_LENGTH+1){
			res.status(500).send('Illegal KEY!');
			return;
		}
		if(!list.hasOwnProperty(path)){
			list[path] = {};
		}
		list[path].template= JSON.parse(req.query.template);
		list[path].data = {};
		res.send({
			status: true
		});
		return;
	}
	if(pathname == '/SYNC'){
		if(!req.query.hasOwnProperty('key') || req.query.length < 2){
			res.status(500).send('Illegal params!');
			return;
		}
		const path = aes.decrypt(KEY, req.query.key);
		if(path.length !== PATH_LENGTH+1){
			res.status(500).send('Illegal KEY!');
			return;
		}
		if(!list.hasOwnProperty(path)){
			res.status(404).send('Pathname not found!');;
			return;
		}

		Object.keys(req.query).forEach(item => {
			if(item != 'key'){
				list[path].data[item] = req.query[item];
			}
		});

		res.send(list[path].data);
		return;
	}



	//match
	if(list.hasOwnProperty(pathname)){
		res.setHeader('Content-Type', 'text/html');
		res.send(fs.readFileSync(__dirname+'/framework.html'));
		return;
	}


	res.status(404).send('Not Found!');
});


let render = function(template, data){
	let s = '';
	template.forEach(item => {
		if(typeof item != 'object') return;
		let type = item.type || 'text';
		if(type == 'text'){
			s += `<h3><b>${item.name}: </b><span>${data[item.id]}</span></h3>`;
		}
		if(type == 'button'){
			s += `<h3><b>${item.name}: </b><span>${data[item.id]}</span></h3> <button onClick="$.get('/SYNC?key='+key+'&${item.id}='+!${data[item.id]})">Switch</button>`;
		}
	});

	return s;
}
