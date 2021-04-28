// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');
const utils = require('./utils.js');
const cp = require('child_process')

let initiateScanMessage = null
let scanResultsMessage = null


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed


const getLocalScanResults = async(imageName, returnFunction) => {
	cp.exec(`trivy image ${imageName} `,  async(err, stdout, stderr) => {

		if (err) {
			console.log('error: ' + err);
			return(err)
		}else{
			let line = await parseOutput(stdout)
			console.log("LINE: ", line)
			returnFunction(line)
		}
	});
}

const parseOutput = async(output) => {
	let lines = output.split('\n')
	let line = lines.filter( line => line.startsWith("Total:"))
	return line.length > 0 ? line[0] : "???"
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
	console.log("in runCMD")
	try{
		return cp.execSync(command + " " + path).toString()
	}catch(result){
		return result.stdout.toString();
	}

}


function activate(context) {


	console.log('Congratulations, your extension "Lacework" is now active!');
	var outputChannel = vscode.window.createOutputChannel("Lacework Scan");

	let disposable = vscode.commands.registerCommand('lacework-vulnerabiltiy.scan', () => {
		// The code you place here will be executed every time your command is executed
		console.log("********:yoyoyoyoyoyoy")
		// Display a message box to the user
		vscode.window.showInformationMessage('Sit tight and grab a beer while we warm up the lacework scanner');
		
		try {
			var version = runCmd("lw-scanner version", "").toString()
			if(!utils.validScanner(version)){
				vscode.window.showErrorMessage("Unsupported Lacwork Scanner version found." + " Please upgrade to v0.1 or higher.");
				return;
			}
			
			const editor = vscode.window.activeTextEditor;
			let document = editor.document;
			const documentText = document.getText();
			console.log(documentText)
			//var scanResult = runCmd("lw-scanner evaluate alpine latest", "");
			outputChannel.show()	
        	outputChannel.appendLine("Sit tight and grab a beer while lw-scanner is about to scan image: ");
			outputChannel.appendLine("yoyo2");
			//context.subscriptions.push(disposable);

		  } catch (e) {
			console.log("Error: ", e)
			return;
		  }


	});

	let findImage = vscode.languages.registerHoverProvider('dockerfile', {
		provideHover(document, position, token){
			const activeEditor = vscode.window.activeTextEditor;

			if (activeEditor) {
				let lineNumber = utils.getLineNumber(activeEditor)
				let lineText = document.lineAt(lineNumber)._text
				let imageName = lineText.startsWith("FROM") ? lineText.split(" ")[1] : ""

				if(imageName != null && imageName != "" && imageName != " "){
					console.log("IN GOOD IMAGE NAME: ", imageName)
					const pingMongo = async() => {
						//let scanResult = await getScanResults(imageName)
						let localScanResult = await getLocalScanResults(imageName, (result ) => {
							initiateScanMessage.dispose()
							scanResultsMessage = decorate(activeEditor, lineNumber, lineText, `Lacework results for ${imageName}: ${result}`)
						})
						
						

					}

					initiateScanMessage =  decorate(activeEditor, lineNumber, lineText, `Initiating Lacework scan for: ${imageName}`)
					pingMongo()
					
	
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