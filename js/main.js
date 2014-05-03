requirejs.config({
  baseUrl: 'js/',

  paths: {
    jquery: 'libs/jquery-1.11.1.min',
    'jquery.cookie': 'lib/jquery.cookie-1.4.0',
    underscore: 'lib/underscore-1.6.0',
    fiber: 'libs/fiber.min'
  },

  shim: {
    'jquery.cookie': {
      deps: ['jquery']
    }
  }
});


require(['controllers/keysController'],
  function (KeysController) {
    var controller = new KeysController();
  });