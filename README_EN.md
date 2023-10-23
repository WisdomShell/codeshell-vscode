# CodeShell VSCode Extension

[![Chinese readme](https://img.shields.io/badge/README-Chinese-blue)](README.md)

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

### Compile the code

+ Linux / Mac(Apple Silicon Devices)

  ```bash
  git clone https://github.com/WisdomShell/llama_cpp_for_codeshell.git
  cd llama_cpp_for_codeshell
  make
  ```

  On macOS, Metal is enabled by default, which allows loading the model onto the GPU for significant performance improvements.

+ Mac(Non Apple Silicon Devices)

  ```bash
  git clone https://github.com/WisdomShell/llama_cpp_for_codeshell.git
  cd llama_cpp_for_codeshell
  LLAMA_NO_METAL=1 make
  ```

  For Mac users with non-Apple Silicon chips, you can disable Metal builds during compilation using the CMake options `LLAMA_NO_METAL=1` or `LLAMA_METAL=OFF` to ensure the model runs properly.

+ Windows

  You have the option to compile the code using the Linux approach within the [Windows Subsystem for Linux](https://learn.microsoft.com/en-us/windows/wsl/about) or you can follow the instructions provided in the [llama.cpp repository](https://github.com/ggerganov/llama.cpp#build). Another option is to configure [w64devkit](https://github.com/skeeto/w64devkit/releases) and then proceed with the Linux compilation method.


### Download the model

On the [Hugging Face Hub](https://huggingface.co/WisdomShell), we provide three different models: [CodeShell-7B](https://huggingface.co/WisdomShell/CodeShell-7B), [CodeShell-7B-Chat](https://huggingface.co/WisdomShell/CodeShell-7B-Chat), and [CodeShell-7B-Chat-int4](https://huggingface.co/WisdomShell/CodeShell-7B-Chat-int4). Below are the steps to download these models.

- To perform inference using the [CodeShell-7B-Chat-int4](https://huggingface.co/WisdomShell/CodeShell-7B-Chat-int4) model, download the model to your local machine and place it in the path of the `llama_cpp_for_codeshell/models` folder as indicated in the code above.

 ```
 git clone https://huggingface.co/WisdomShell/CodeShell-7B-Chat-int4/blob/main/codeshell-chat-q4_0.gguf
 ```

- For performing inference using [CodeShell-7B](https://huggingface.co/WisdomShell/CodeShell-7B) and [CodeShell-7B-Chat](https://huggingface.co/WisdomShell/CodeShell-7B-Chat) models, after placing the models in a local folder, you can utilize [TGI (Text Generation Inference)](https://github.com/WisdomShell/text-generation-inference.git) to load these local models and initiate the model service.

### Load the model

- The `CodeShell-7B-Chat-int4` model can be served as an API using the `server` command within the `llama_cpp_for_codeshell` project.

```bash
./server -m ./models/codeshell-chat-q4_0.gguf --host 127.0.0.1 --port 8080
```

Note: In cases where Metal is enabled during compilation, if you encounter runtime exceptions, you can explicitly disable Metal GPU inference by adding the `-ngl 0` parameter in the command line to ensure the proper functioning of the model.

- [CodeShell-7B](https://huggingface.co/WisdomShell/CodeShell-7B) and [CodeShell-7B-Chat](https://huggingface.co/WisdomShell/CodeShell-7B-Chat) models, loading local models with [TGI](https://github.com/WisdomShell/text-generation-inference.git) and starting the model service.

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

- Set the address for the CodeShell service
- Configure whether to enable automatic code completion suggestions
- Set the time delay for triggering automatic code completion suggestions
- Specify the maximum number of tokens for code completion
- Specify the maximum number of tokens for Q&A
- Configure the model runtime environment

Note: Different model runtime environments can be configured within the plugin. For the [CodeShell-7B-Chat-int4](https://huggingface.co/WisdomShell/CodeShell-7B-Chat-int4) model, you can choose the `CPU with llama.cpp"`option in the `Code Shell: Run Env For LLMs` menu. However, for the [CodeShell-7B](https://huggingface.co/WisdomShell/CodeShell-7B) and [CodeShell-7B-Chat](https://huggingface.co/WisdomShell/CodeShell-7B-Chat) models, you should select the `GPU with TGI toolkit` option.

![插件配置截图](https://resource.zsmarter.cn/appdata/codeshell-vscode/screenshots/docs_settings_new.png)

## Features

### 1. Code Completion

- Automatic Code Suggestions
- Keyboard Shortcut for Code Suggestions

During the coding process, code completion suggestions can automatically trigger when you pause input (configurable with the `Auto Completion Delay` option, set to 1-3 seconds). Alternatively, you can manually trigger code completion suggestions using the shortcut key `Alt+\` (for Windows) or `Option+\` (for Mac).

When the plugin provides code suggestions, the suggested content appears in gray at the editor's cursor position. You can press the Tab key to accept the suggestion or continue typing to ignore it.

![代码建议截图](https://resource.zsmarter.cn/appdata/codeshell-vscode/screenshots/docs_completion.png)

### 2. Code Assistance

- Explain/Optimize/Cleanse a Code Segment
- Generate Comments/Unit Tests for Code
- Check Code for Performance/Security Issues

In the VSCode sidebar, open the plugin's Q&A interface. Select a portion of code in the editor, right-click to access the CodeShell menu, and choose the corresponding function. The plugin will provide relevant responses in the Q&A interface.

![代码辅助截图](https://resource.zsmarter.cn/appdata/codeshell-vscode/screenshots/docs_assistants.png)

### 3. Code Q&A

- Support for Multi-turn Conversations
- Maintain Conversation History
- Engage in Multi-turn Dialogues Based on Previous Conversations
- Edit Questions and Rephrase Inquiries
- Request Fresh Responses for Any Question
- Interrupt During the Answering Process

![智能问答截图](https://resource.zsmarter.cn/appdata/codeshell-vscode/screenshots/docs_chat.png)

Within the Q&A interface's code block, you can click the copy button to copy the code block or use the insert button to insert the code block's content at the editor's cursor location.

## License

Apache 2.0
