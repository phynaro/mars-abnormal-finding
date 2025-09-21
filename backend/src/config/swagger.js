const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load OpenAPI specification from YAML file
const swaggerDocument = YAML.load(path.join(__dirname, '../../swagger/work-request-api.yaml'));

// Swagger configuration options
const options = {
  definition: swaggerDocument,
  apis: [], // We're using external YAML file instead of inline JSDoc
};

// Generate swagger specification
const swaggerSpec = swaggerJSDoc(options);

// Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none', // 'list', 'full', 'none'
    filter: true,
    showRequestDuration: true,
    showCommonExtensions: true,
    showExtensions: true,
    supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
    tryItOutEnabled: true,
    requestInterceptor: (request) => {
      // Add custom headers or modify requests if needed
      console.log('Swagger request:', request.url);
      return request;
    },
    responseInterceptor: (response) => {
      // Log responses for debugging
      console.log('Swagger response:', response.status, response.url);
      return response;
    }
  },
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { 
      color: #3b4151;
      font-size: 36px;
      margin: 0 0 10px 0;
    }
    .swagger-ui .scheme-container { 
      background: #f7f7f7;
      padding: 15px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .swagger-ui .auth-wrapper {
      padding: 20px 0;
      border-top: 1px solid #ebebeb;
      margin-top: 20px;
    }
    
    /* Ensure all button text is visible */
    .swagger-ui .btn {
      color: #ffffff !important;
      text-shadow: none !important;
    }
    .swagger-ui .btn.authorize {
      background-color: #49cc90;
      border-color: #49cc90;
      color: #ffffff !important;
    }
    .swagger-ui .btn.authorize:hover {
      background-color: #3eb881;
      border-color: #3eb881;
      color: #ffffff !important;
    }
    
    /* Ensure try it out buttons are visible */
    .swagger-ui .btn.try-out__btn {
      color:rgb(44, 152, 91) !important;
    }
    
    /* Ensure execute buttons are visible */
    .swagger-ui .btn.execute {
      color: #ffffff !important;
    }
    
    /* Ensure cancel buttons are visible */
    .swagger-ui .btn.cancel {
      color:rgb(231, 47, 47) !important;
    }
    
    /* Fix close button text visibility */
    .swagger-ui .btn.btn-done {
      color: #333333 !important;
      background-color: #ffffff;
      border-color: #cccccc;
    }
    .swagger-ui .btn.btn-done:hover {
      color: #000000 !important;
      background-color: #f5f5f5;
      border-color: #999999;
    }
    
    /* Fix logout button text visibility */
    .swagger-ui .btn.auth {
      color: #333333 !important;
      background-color: #ffffff;
      border-color: #cccccc;
    }
    .swagger-ui .btn.auth:hover {
      color: #000000 !important;
      background-color: #f5f5f5;
      border-color: #999999;
    }
  `,
            customSiteTitle: "MARS System API Documentation",
  customfavIcon: "/favicon.ico"
};

module.exports = {
  swaggerSpec,
  swaggerUi,
  swaggerUiOptions,
  serve: swaggerUi.serve,
  setup: swaggerUi.setup(swaggerDocument, swaggerUiOptions)
};
