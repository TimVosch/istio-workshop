const { promises: fs } = require("fs");
const { JWK } = require("node-jose");
const _module = {};

const keystore = JWK.createKeyStore();

/**
 * Load a PEM key from a file
 */
_module.loadKeyFile = async (path) => {
  const fileContents = await fs.readFile(path);
  return keystore.add(fileContents, "pem");
};

/**
 * Return the public JWK set
 */
_module.getJWKS = () => keystore.toJSON();

module.exports = _module;
