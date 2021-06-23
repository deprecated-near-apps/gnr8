import React from "react"
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-jsx";
import "ace-builds/src-noconflict/mode-markdown";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/theme-chrome";
import "ace-builds/src-min-noconflict/ext-searchbox";
import "ace-builds/src-min-noconflict/ext-language_tools";

export const Ace = (props) => {

    const { value, onChange, onLoad } = props

    return <AceEditor
        mode="jsx"
        theme="chrome"
        value={value}
        name="ace-editor"
        width="100%"
        height="100%"
        fontSize="0.8rem"
        editorProps={{
            $blockScrolling: true,
        }}
        setOptions={{
            useWorker: false,
            showLineNumbers: true,
            tabSize: 4
        }}
        onChange={onChange}
        onLoad={onLoad}
    />
}