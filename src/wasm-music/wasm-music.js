import { ungzip } from 'https://unpkg.com/pako@2.0.3/dist/pako.esm.mjs';

const nearconfig = {
    nodeUrl: 'https://rpc.mainnet.near.org',
    walletUrl: 'https://wallet.mainnet.near.org',
    helperUrl: 'https://helper.mainnet.near.org',
    networkId: 'mainnet',
    contractName: 'psalomo.near',
    deps: {
        keyStore: null
    }
};

nearconfig.deps.keyStore = new nearApi.keyStores.BrowserLocalStorageKeyStore();

let wasm_bytes;

export async function getTokenContent(token_id) {
    const near = await nearApi.connect(nearconfig);
    const walletConnection = new nearApi.WalletConnection(near);

    const result = await walletConnection.account()
        .viewFunction(nearconfig.contractName, 'view_token_content_base64', { token_id: token_id });
    return result;
}

export function base64ToByteArray(base64encoded) {
    return ((str) => new Uint8Array(str.length).map((v, n) => str.charCodeAt(n)))(atob(base64encoded));
}

export async function loadMusic(tokenId) {
    wasm_bytes = ungzip(base64ToByteArray((await getTokenContent(tokenId + '')).replaceAll(/\"/g, '')));
}

export async function playMusic(context) {
    console.log('before add module')
    await context.audioWorklet.addModule('./wasm-music/audioworkletprocessor.js');
    console.log('after add module')
    const audioWorkletNode = new AudioWorkletNode(context, 'asc-midisynth-audio-worklet-processor', {
        outputChannelCount: [2]
    });
    audioWorkletNode.port.start();
    audioWorkletNode.port.postMessage({ wasm: wasm_bytes });
    audioWorkletNode.connect(context.destination);
    return audioWorkletNode;
}

window.loadMusic = loadMusic;
window.playMusic = playMusic;

console.log('wasm music loaded');