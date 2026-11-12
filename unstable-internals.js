let AssetSourceResolver;
try {
  AssetSourceResolver = require('react-native/Libraries/Image/AssetSourceResolver');
} catch (e) {
  AssetSourceResolver = class AssetSourceResolver {
    constructor(serverUrl, jsbundleUrl, asset) {
      this.serverUrl = serverUrl;
      this.jsbundleUrl = jsbundleUrl;
      this.asset = asset;
    }
    defaultAsset() {
      return this.asset;
    }
    scaledAssetURL() {
      return this.asset.httpServerLocation + '/' + this.asset.name + '.' + this.asset.type;
    }
  };
}

module.exports = {
  AssetSourceResolver,
};
