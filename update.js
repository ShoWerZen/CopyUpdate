//node update.js {cloudFolder} {boxFolder}
(async function() {
	const fs = require("fs");
	const readline = require("readline");
	const rl = readline.createInterface({
	    input: process.stdin,
	    output: process.stdout
	});

	let confirm = {};

	const targetFolders = ["CR", "Data", "PDF", "QB108"];
	let missFolders = [];
	let boxChildfolders = [];

	let cloudFolder = await ask("輸入雲端資料夾路徑 => ");
	try {
		cloudFolder = cloudFolder.trim();
		if(cloudFolder[cloudFolder.length - 1] == "/")
			cloudFolder = cloudFolder.substring(0, cloudFolder.length - 1);
		fs.accessSync(cloudFolder, fs.constants.R_OK | fs.constants.W_OK);
		confirm["雲端資料夾路徑"] = cloudFolder;
	} catch (err) {
		console.error('cannot access cloudFolder!', err);
		process.exit(0);
	}

	let boxFolder = await ask("輸入硬碟資料夾路徑 => ");
	try {
		boxFolder = boxFolder.trim();
		if(boxFolder[boxFolder.length - 1] == "/")
			boxFolder = boxFolder.substring(0, boxFolder.length - 1);
		fs.accessSync(boxFolder, fs.constants.R_OK | fs.constants.W_OK);
		confirm["硬碟資料夾路徑"] = boxFolder;
	} catch (err) {
		console.error('cannot access boxFolder!', err);
		process.exit(0);
	}

	let total = 0;
	let ok = 0;

	//check folder
	boxChildfolders = await getChildFolders(boxFolder);

	if(childFoldersMatch()){
		confirm["資料夾檢測"] = `${targetFolders.join(",")} 皆存在`;
		try{
			let _configPath = `${boxFolder}/../Resources/config.txt`;
			fs.accessSync(_configPath, fs.constants.R_OK | fs.constants.W_OK);
			let _txt = fs.readFileSync(_configPath, "utf-8");
			let _version = _txt.split("<Version>")[1].split("</Version>")[0];
			let _newVersion = await ask(`請輸入新的 config version（目前為${_version}）=> `);
			let _newTxt = _txt.replace(_version, _newVersion);
			fs.writeFileSync(_configPath, _newTxt);
			confirm["config檔"] = _newVersion;
		}
		catch(err){
			confirm["config檔"] = "未找到config檔"; 
			console.log(err);
		}
		start();
	}
	else{
		confirm["資料夾檢測"] = `硬碟資料夾有少(${missFolders.join(",")})`;
		let _continue = await ask(`硬碟資料夾有少(${missFolders.join(",")}) 繼續嗎? (y/n)`);
		if(_continue.toLowerCase() === "y")
	    	start();
	    else{
	    	waitForExit();
	    }
	}

	function ask(_question){
		return new Promise((resolve, reject) => {
			rl.question(_question, function(_ans) {
		    	resolve(_ans);
			});
		});
	}

	async function start(){
		try{
			console.log(confirm);
			let _ok = await ask("資料是否正確? (y/n)");
			if(_ok.toLowerCase() === "y"){
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

				waitForExit();
			}
			else
				waitForExit();
		}
		catch(err){
			console.log("err", err);

			waitForExit();
		}
	}

	async function waitForExit(){
		await ask(`按任意鍵結束`);
		process.exit(0);
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
			if(!boxChildfolders.includes(_folder)){
				_match = false;
				missFolders.push(_folder);
			}
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