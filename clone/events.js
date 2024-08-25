const plugins = {
    commands: {},
    callbacks: {}
};
  

function addCommand(name, action) {
    plugins.commands[name] = action;
};
    
function addCallback(name, action) {
    plugins.callbacks[name] = action;
};

module.exports = {
    plugins,
    addCommand,
    addCallback
};