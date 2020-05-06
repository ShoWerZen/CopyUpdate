//node update.js {cloudFolder} {boxFolder}
(async function() {
	const fs = require("fs");
	const readline = require("readline");
	const rl = readline.createInterface({
	    input: process.stdin,
	    output: process.stdout
	});

	const targetFolders = ["CR", "Data", "PDF", "QB108"];
	let boxChildfolders = [];

	let cloudFolder = await getCloudFolder();
	try {
		cloudFolder = cloudFolder.trim();
		if(cloudFolder[cloudFolder.length - 1] == "/")
			cloudFolder = cloudFolder.substring(0, cloudFolder.length - 1);
		fs.accessSync(cloudFolder, fs.constants.R_OK | fs.constants.W_OK);
	} catch (err) {
		console.error('cannot access cloudFolder!', err);
		process.exit(0);
	}

	let boxFolder = await getBoxFolder();
	try {
		boxFolder = boxFolder.trim();
		if(boxFolder[boxFolder.length - 1] == "/")
			boxFolder = boxFolder.substring(0, boxFolder.length - 1);
		fs.accessSync(boxFolder, fs.constants.R_OK | fs.constants.W_OK);
	} catch (err) {
		console.error('cannot access boxFolder!', err);
		process.exit(0);
	}

	let total = 0;
	let ok = 0;

	//check folder
	boxChildfolders = await getChildFolders(boxFolder);

	if(childFoldersMatch())
		start();
	else{
		rl.question("Folders not match!! Continue? (y/n) ", function(_continue) {
	    	if(_continue === "y")
		    	start();
		});
	}

	function getCloudFolder(){
		return new Promise((resolve, reject) => {
			rl.question("輸入雲端資料夾路徑 => ", function(_path) {
		    	resolve(_path);
			});
		});
	}

	function getBoxFolder(){
		return new Promise((resolve, reject) => {
			rl.question("輸入硬碟資料夾路徑 => ", function(_path) {
		    	resolve(_path);
			});
		});
	}

	async function start(){
		try{
			let _getFilesPromises = [];
			targetFolders.forEach((_folder) => {
				_getFilesPromises.push(getFilesMap(`${cloudFolder}/${_folder}`));
			});

			let _maps = await Promise.all(_getFilesPromises);

			let _moveFilePromises = [];

			_maps.forEach((_map) => {
				// {
				// 	folder: [files],
				// 	folder: [files],
				// }
				let _folders = Object.keys(_map);
				
				_folders.forEach((_folder) => {
					let _files = _map[_folder];
					total += _files.length;
					_files.forEach((_file) => {
						_moveFilePromises.push(moveFile(_folder, _file));
					});
				});
			});

			await Promise.all(_moveFilePromises);

			console.log("OK");
		}
		catch(err){
			console.log("err", err);
		}
	}
	
	function getChildFolders(_root){
		return new Promise((resolve, reject) => {
			let _dirents = fs.readdirSync(_root, {withFileTypes: true});
			let _folders = [];
			
			_dirents.forEach((_dirent) => {
				if(_dirent.isDirectory())
					_folders.push(_dirent.name);
			});
			
			resolve(_folders);
		});
	}

	function childFoldersMatch(){
		let _match = true;

		targetFolders.forEach((_folder) => {
			if(!boxChildfolders.includes(_folder))
				_match = false;
		});

		return _match;
	}

	function getFilesMap(_path){
		return new Promise((resolve, reject) => {
			let _currentFolder = _path.replace(`${cloudFolder}/`, "");
			let _dirents = fs.readdirSync(_path, {withFileTypes: true});

			let _promises = [];
			let _currentMap = {};
			_currentMap[_currentFolder] = [];

			_dirents.forEach((_dirent) => {
				if(_dirent.isDirectory())
					_promises.push(getFilesMap(`${_path}/${_dirent.name}`));
				else
					_currentMap[_currentFolder].push(_dirent.name);
			});

			Promise.all(_promises).then((_maps) => {
				_maps.forEach((_map) => {
					Object.keys(_map).forEach((_folder) => {
						_currentMap[_folder] = _map[_folder];
					});
				});
				
				resolve(_currentMap);
			}, (err) => {
				reject(err);
			});
		});
	}

	function moveFile(_folder, _file){
		return new Promise((resolve, reject) => {
			let _source = `${cloudFolder}/${_folder}/${_file}`;
			let _target = `${boxFolder}/${_folder}/${_file}`;
			fs.mkdir(`${boxFolder}/${_folder}`, { recursive: true }, (err) => {
                if (err)
                    reject(err);
                else {
                    fs.copyFile(_source, _target, (err) => {
                        if(err)
                            reject(err);
                        else{
                        	ok++;
                        	console.log(`(${ok} / ${total}) ${_folder}/${_file}`);
                            resolve("");
                        }
                    });
                }
            });
		})
	}
})()