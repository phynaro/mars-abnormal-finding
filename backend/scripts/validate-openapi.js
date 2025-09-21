#!/usr/bin/env node

const YAML = require('yamljs');
const path = require('path');

/**
 * Simple OpenAPI 3.0 specification validator
 * This script validates the basic structure of our OpenAPI YAML file
 */

function validateOpenAPI() {
  try {
    console.log('🔍 Validating OpenAPI specification...');
    
    const specPath = path.join(__dirname, '../swagger/work-request-api.yaml');
    const spec = YAML.load(specPath);
    
    // Basic validation checks
    const validationErrors = [];
    
    // Check required root properties
    if (!spec.openapi) validationErrors.push('Missing "openapi" version');
    if (!spec.info) validationErrors.push('Missing "info" section');
    if (!spec.paths) validationErrors.push('Missing "paths" section');
    
    // Check OpenAPI version format
    if (spec.openapi && !spec.openapi.match(/^3\.\d+\.\d+$/)) {
      validationErrors.push('Invalid OpenAPI version format');
    }
    
    // Check info section
    if (spec.info) {
      if (!spec.info.title) validationErrors.push('Missing "info.title"');
      if (!spec.info.version) validationErrors.push('Missing "info.version"');
    }
    
    // Count paths and operations
    let pathCount = 0;
    let operationCount = 0;
    
    if (spec.paths) {
      pathCount = Object.keys(spec.paths).length;
      Object.values(spec.paths).forEach(pathItem => {
        Object.keys(pathItem).forEach(method => {
          if (['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'].includes(method)) {
            operationCount++;
          }
        });
      });
    }
    
    // Count components
    let schemaCount = 0;
    let responseCount = 0;
    
    if (spec.components) {
      if (spec.components.schemas) {
        schemaCount = Object.keys(spec.components.schemas).length;
      }
      if (spec.components.responses) {
        responseCount = Object.keys(spec.components.responses).length;
      }
    }
    
    // Report results
    if (validationErrors.length > 0) {
      console.log('❌ Validation failed with errors:');
      validationErrors.forEach(error => console.log(`   - ${error}`));
      process.exit(1);
    } else {
      console.log('✅ OpenAPI specification is valid!');
      console.log('');
      console.log('📊 Specification Summary:');
      console.log(`   OpenAPI Version: ${spec.openapi}`);
      console.log(`   API Title: ${spec.info.title}`);
      console.log(`   API Version: ${spec.info.version}`);
      console.log(`   Paths: ${pathCount}`);
      console.log(`   Operations: ${operationCount}`);
      console.log(`   Schemas: ${schemaCount}`);
      console.log(`   Response Templates: ${responseCount}`);
      console.log('');
      
      if (spec.servers && spec.servers.length > 0) {
        console.log('🌐 Configured Servers:');
        spec.servers.forEach(server => {
          console.log(`   - ${server.url} (${server.description || 'No description'})`);
        });
        console.log('');
      }
      
      if (spec.tags && spec.tags.length > 0) {
        console.log('🏷️  API Tags:');
        spec.tags.forEach(tag => {
          console.log(`   - ${tag.name}: ${tag.description || 'No description'}`);
        });
        console.log('');
      }
      
      console.log('🚀 Access your API documentation at:');
      console.log('   http://localhost:3001/api-docs');
      console.log('');
      console.log('📄 Download OpenAPI spec at:');
      console.log('   http://localhost:3001/api-docs.json');
    }
    
  } catch (error) {
    console.error('❌ Error validating OpenAPI specification:', error.message);
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  validateOpenAPI();
}

module.exports = { validateOpenAPI };
