const { promises: fs } = require("fs");
const { JWK } = require("node-jose");
const _module = {};

const keystore = JWK.createKeyStore();
let latestKID = null;

/**
 * Load a PEM key from a file
 */
_module.loadKeyFile = async (path) => {
  const fileContents = await fs.readFile(path);
  const key = await keystore.add(fileContents, "pem");
  latestKID = key.kid;
  return key;
};

/**
 * Return the public JWK set
 */
_module.getJWKS = () => keystore.toJSON();

/**
 * Returns the last loaded key in PEM format
 * This is used to sign Json Web Tokens
 */
_module.getPEM = async (kid, private = false) => {
  const key = await JWK.asKey(keystore.get(kid));
  return key.toPEM(private);
};

/**
 * Return the last added key
 */
_module.getLatestKID = () => latestKID;

module.exports = _module;
