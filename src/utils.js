const cp = require('child_process');
const vscode = require('vscode');

let minScannerVersion = 0.0
let initiateScanMessage = null


exports.getLineNumber = (activeEditor) => {
    return activeEditor.selection.active.line;
}



exports.getLineNumberFromText = (document, imageName) =>{
    let lineCount = document.lineCount;
    for (let lineNumber = 0; lineNumber < lineCount; lineNumber++) {
        let lineText = document.lineAt(lineNumber);
        if(lineText.text.indexOf(`FROM ${imageName}`) != -1){
            return {lineNumber: lineNumber, lineText: lineText.text}
        }
    }

    return {lineNumber: -1, lineText: ''}
}

exports.validScanner = (version) => {

    try{
        v = parseFloat(version.split(": ")[1])
        if(v > minScannerVersion){
            return true
        }
        return false
    }catch(e){
        return false
    }
}

exports.getImage = (documentText) => {
    let index = documentText.indexOf("FROM")

    if(documentText.indexOf("FROM") >= 0){
        let imageName = documentText.split("FROM ")[1].split(/\s+/)[0]
        let [repo, tag] = imageName.split(":")
        return [repo, tag, imageName]
    }else{
        return [null, null]
    }
}







