
let minScannerVersion = 0.0


exports.getLineNumber = (activeEditor) => {
    return activeEditor.selection.active.line;
}


exports.validScanner = (version) => {

    try{
        v = parseFloat(version.slice(16, 19))
        if(v > minScannerVersion){
            return true
        }
        return false
    }catch(e){
        return false
    }
}


