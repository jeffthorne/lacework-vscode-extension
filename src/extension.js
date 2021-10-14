const vscode = require('vscode');
const utils = require('./utils.js');
const cp = require('child_process')

let initiateScanMessage = null
let scanResultsMessage = null


const getLocalScanResults = async(imageName, returnFunction) => {
	cp.exec(`lw-scanner evaluate ${imageName} --scan-library-packages`,  async(err, stdout, stderr) => {

		if (err) {
			let line = 'Lacework Scan error: please check output logs'
			returnFunction({line: line, stdout: err, error: err.message})
		}else{
			let output = await parseOutput(stdout)
			if(output.total > 0){
				vscode.window.showErrorMessage("Lacework Scan: Vulnerabilities found, please check output log for details.");
			}
			returnFunction({line: output.line, stdout: stdout})
		}
	});
}


const parseOutput = async(output) => {
	let critical = 0;
	let high = 0;
	let medium = 0;
	let low = 0;
	let info = 0;

	if(output.indexOf('Good news! This image has no vulnerabilities.') == -1){		
		critical = parseInt(output.split("Critical")[1].trim().split(" ")[0])
		high = parseInt(output.split("High")[1].trim().split(" ")[0])
		medium = parseInt(output.split("Medium")[1].trim().split(" ")[0])
		low = parseInt(output.split("Low")[1].trim().split(" ")[0])
		info = parseInt(output.split("Info")[1].trim().split(" ")[0])
	}

	let total = critical + high + medium + low + info
	let line = `Total: ${total} (CRITICAL: ${critical}, HIGH: ${high}, MEDIUM: ${medium}, LOW: ${low}, INFO: ${info})`
	return line.length > 0 ? { line: line, total:total } : { line:"???", total:0 }

}




const decorate = (editor, lineNumber, lineText, message) => {
	scanResultsMessage ? scanResultsMessage.dispose() : ""
	initiateScanMessage ? initiateScanMessage.dispose() : ""
	const decorationType = vscode.window.createTextEditorDecorationType({
		fontWeight: '500',
		color: '#2C7BE5',
		backgroundColor: 'green',
		after: { margin: '0 0 0 1rem', contentText: message, color: '#2C7BE5' },
	  });
	 

	 editor.setDecorations(decorationType, [new vscode.Range(lineNumber,lineText.length,lineNumber,lineText.length)])
	 return decorationType;

}

function runCmd(command, path){
	try{
		return cp.execSync(command + " " + path).toString()
	}catch(result){
		return result.stdout.toString();
	}

}


function activate(context) {

	var outputChannel = vscode.window.createOutputChannel("Lacework Scan");

	let disposable = vscode.commands.registerCommand('lacework-vulnerabiltiy.scan', () => {
		
		try {
			var version = runCmd("lw-scanner version", "").toString()
	
			if(!utils.validScanner(version)){
				vscode.window.showErrorMessage("Unsupported Lacwork Scanner version found." + " Please upgrade to v0.2.0 or higher.");
				return;
			}
			
			const editor = vscode.window.activeTextEditor;
			let document = editor.document;
			const documentText = document.getText();
			let [repo, tag, imageName] = utils.getImage(documentText)
			let lineNumber = utils.getLineNumberFromText(document, imageName)
			initiateScanMessage =  decorate(editor, lineNumber.lineNumber, lineNumber.lineText, `Initiating Lacework scan for: ${repo}:${tag}`)

			const processScanRequest = async() => {
				let localScanResult = await getLocalScanResults(`${repo} ${tag}`, (result ) => {


					if(result.error != undefined){
						if(result.error.indexOf("ERROR: Error while scanning image: No docker image found.") >= 0){
							vscode.window.showErrorMessage("'Error while scanning image: No docker image found'");
							outputChannel.show();
							outputChannel.appendLine(result.error);
						}
					}else{
						if(lineNumber.lineNumber >= 0){
							initiateScanMessage.dispose()
							scanResultsMessage = decorate(editor, lineNumber.lineNumber, lineNumber.lineText, `Lacework results for ${repo}:${tag}: ${result.line}`)
							setTimeout(() => {  scanResultsMessage.dispose(); }, 20000);
						}
						outputChannel.show();
						outputChannel.appendLine(result.stdout);
					}
				});
			}
			processScanRequest()

		  } catch (e) {
			console.log("IN Activate Error: ", e)
			return;
		  }


	});

	let findImage = vscode.languages.registerHoverProvider('dockerfile', {
		provideHover(document, position, token){
			const activeEditor = vscode.window.activeTextEditor;

			if (activeEditor) {
				let lineNumber = utils.getLineNumber(activeEditor)
				let lineText = document.lineAt(lineNumber)._text
				let imageNameTemp = lineText.startsWith("FROM") ? lineText.split(" ")[1] : ""
				imageName = imageNameTemp.replace(":", " ")

				if(imageName != null && imageName != "" && imageName != " "){

					const processScanRequest = async() => {
						let localScanResult = await getLocalScanResults(imageName, (result) => {

							if(result.error != undefined){
								errorMessage = decorate(activeEditor, lineNumber, lineText, `Error: please check output logs`)
								setTimeout(() => {  errorMessage.dispose(); }, 7000);
								outputChannel.show();
								outputChannel.appendLine(result.error);
							}else{
								initiateScanMessage.dispose()
								scanResultsMessage = decorate(activeEditor, lineNumber, lineText, `Lacework results for ${imageNameTemp}: ${result.line}`)
								setTimeout(() => {  scanResultsMessage.dispose(); }, 20000);
								outputChannel.show();
								outputChannel.appendLine(result.stdout);
							}
						})	
					}

					initiateScanMessage =  decorate(activeEditor, lineNumber, lineText, `Initiating Lacework scan for: ${imageNameTemp}`)
					processScanRequest()						
				}
			}

		}
	})

	context.subscriptions.push(disposable);
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate,
	runCmd
}