# CodeShell VSCode Extension

The `codeshell-vscode` project is an open-source plugin developed based on the [CodeShell LLM](https://github.com/WisdomShell/codeshell) that supports [Visual Studio Code](https://code.visualstudio.com/Download). It serves as an intelligent coding assistant, offering support for various programming languages such as Python, Java, C/C++, JavaScript, Go, and more. This plugin provides features like code completion, code interpretation, code optimization, comment generation, and conversational Q&A to help developers enhance their coding efficiency in an intelligent manner.

## Requirements

- [node](https://nodejs.org/en) version v18 and above
- Visual Studio Code version 1.68 and above
- The [CodeShell](https://github.com/WisdomShell/llama_cpp_for_codeshell) service is running

## Compile the Plugin

If you want to run the package from source code, you need to execute the following command:

```zsh
git clone https://github.com/WisdomShell/codeshell-vscode.git
cd codeshell-vscode
npm install
npm exec vsce package
```

and it will create a visx package file like: `codeshell-vscode-${VERSION_NAME}.vsix`。

##  Model Service

The [`llama_cpp_for_codeshell`](https://github.com/WisdomShell/llama_cpp_for_codeshell) project provides the 4-bit quantized model service of the [CodeShell](https://github.com/WisdomShell/codeshell) LLM, named `codeshell-chat-q4_0.gguf`. Here are the steps to deploy the model service:

### Get the Code

```bash
git clone https://github.com/WisdomShell/llama_cpp_for_codeshell.git
cd llama_cpp_for_codeshell
make
```

Note: On macOS, the Metal architecture is enabled by default, and enabling Metal allows models to be loaded and executed on the GPU, significantly improving performance. For Mac users with non-Apple Silicon chips, you can disable Metal build during compilation using CMake options `LLAMA_NO_METAL=1` or `LLAMA_METAL=OFF` to ensure that the model functions properly.

### Load the model locally

After downloading the model from the [Hugging Face Hub](https://huggingface.co/WisdomShell/CodeShell-7B-Chat-int4/blob/main/codeshell-chat-q4_0.gguf) to your local machine, placing the model in the folder: `llama_cpp_for_codeshell/models`, it will allow you to load the model locally.

```bash
git clone https://huggingface.co/WisdomShell/CodeShell-7B-Chat-int4/blob/main/codeshell-chat-q4_0.gguf
```

### Deploy the Model 

Use the `server` command in the `llama_cpp_for_codeshell` project to provide API services.

```bash
cd llama_cpp_for_codeshell
./server -m ./models/codeshell-chat-q4_0.gguf --host 127.0.0.1 --port 8080
```

The default deployment is on local port 8080, and it can be called through the POST method.

Note: In cases where Metal is enabled during compilation, you can also explicitly disable Metal GPU inference by adding the command-line parameter `-ngl 0`, ensuring that the model functions properly.

## Model Service [NVIDIA GPU]

For users wishing to use NVIDIA GPUs for inference, the [`text-generation-inference`](https://github.com/huggingface/text-generation-inference) project can be used to deploy the [CodeShell Large Model](https://github.com/WisdomShell/codeshell). Below are the steps to deploy the model service:

### Download the Model

After downloading the model from the [Hugging Face Hub](https://huggingface.co/WisdomShell/CodeShell-7B-Chat) to your local machine, place the model under the path of the `$HOME/models` folder, and you can load the model locally.

```bash
git clone https://huggingface.co/WisdomShell/CodeShell-7B-Chat
```

### Deploy the Model

The following command can be used for GPU-accelerated inference deployment with text-generation-inference:

```bash
docker run --gpus 'all' --shm-size 1g -p 9090:80 -v $HOME/models:/data \
        --env LOG_LEVEL="info,text_generation_router=debug" \
        ghcr.nju.edu.cn/huggingface/text-generation-inference:1.0.3 \
        --model-id /data/CodeShell-7B-Chat --num-shard 1 \
        --max-total-tokens 5000 --max-input-length 4096 \
        --max-stop-sequences 12 --trust-remote-code
```

For a more detailed explanation of the parameters, please refer to the [text-generation-inference project documentation](https://github.com/huggingface/text-generation-inference).


##  Configure the Plugin

- Set the address for the CodeShell service.
- Configure whether to enable automatic code completion suggestions.
- Set the time delay for triggering automatic code completion suggestions.
- Specify the maximum number of tokens for code completion.
- Specify the maximum number of tokens for Q&A.

![插件配置截图](https://resource.zsmarter.cn/appdata/codeshell-vscode/screenshots/docs_settings.png)

## Features

### 1. Code Assistance

- Explain/Optimize/Cleanse a Code Segment
- Generate Comments/Unit Tests for Code
- Check Code for Performance/Security Issues

In the VSCode sidebar, open the plugin's Q&A interface. Select a portion of code in the editor, right-click to access the CodeShell menu, and choose the corresponding function. The plugin will provide relevant responses in the Q&A interface.

Within the Q&A interface's code block, you can click the copy button to copy the code block or use the insert button to insert the code block's content at the editor's cursor location.

![代码辅助截图](https://resource.zsmarter.cn/appdata/codeshell-vscode/screenshots/docs_assistants.png)

### 2. Code Q&A

- Support for Multi-turn Conversations
- Maintain Conversation History
- Engage in Multi-turn Dialogues Based on Previous Conversations
- Edit Questions and Rephrase Inquiries
- Request Fresh Responses for Any Question
- Interrupt During the Answering Process

![智能问答截图](https://resource.zsmarter.cn/appdata/codeshell-vscode/screenshots/docs_chat.png)

## License
Apache 2.0
