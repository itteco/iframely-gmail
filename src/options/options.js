// Saves options to localStorage.
function save_options() {

    var cb = document.getElementById("id-editor-insert-thumbnails");

    chrome.extension.sendMessage({
        method: "setLocalStorage",
        key: "disable-editor-feature",
        value: !cb.checked
    });
}

// Restores select box state to saved value from localStorage.
function restore_options() {

    var cb = document.getElementById("id-editor-insert-thumbnails");

    chrome.extension.sendMessage({
        method: "getLocalStorage",
        key: "disable-editor-feature"
    }, function(message) {
        cb.checked = message != "true";
    });
}
document.addEventListener('DOMContentLoaded', restore_options);
document.querySelector('#id-editor-insert-thumbnails').addEventListener('change', save_options);