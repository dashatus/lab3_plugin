"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;

const vscode = require("vscode");

let tasks = [];
let taskIdCounter = 0;
let panel;

function activate(context) {

    const addTaskCommand = vscode.commands.registerCommand('todo.addTask', async () => {
        const description = await vscode.window.showInputBox({ prompt: 'Введите описание задачи' });
        if (description) {
            tasks.push({ id: taskIdCounter++, description, completed: false });
            updateTasksView();
        }
    });

    const filterTasksCommand = vscode.commands.registerCommand('todo.filterTasks', async () => {
        const option = await vscode.window.showQuickPick(['Все', 'Выполненные', 'Невыполненные'], {
            placeHolder: 'Выберите фильтр задач'
        });
        if (option) {
            vscode.window.showInformationMessage(`Фильтр задач: ${option}`);
            updateTasksView(option);
        }
    });

    const showTasksCommand = vscode.commands.registerCommand('todo.showTasks', () => {
        if (!panel) {
            panel = vscode.window.createWebviewPanel('todoTasks', 'To-Do List', vscode.ViewColumn.One, {
                enableScripts: true
            });
    
            panel.onDidDispose(() => {
                panel = undefined;
            });

            panel.webview.onDidReceiveMessage(message => {
                switch (message.command) {
                    case 'toggleTask':
                        toggleTask(message.id);
                        return;
                    case 'deleteTask':
                        deleteTask(message.id);
                        return;
                }
            }, undefined, context.subscriptions);

            updateTasksView();
        } else {
            updateTasksView();
        }
    });

    context.subscriptions.push(addTaskCommand);
    context.subscriptions.push(filterTasksCommand);
    context.subscriptions.push(showTasksCommand);
}

function updateTasksView(filterOption) {
    if (panel) {
        const filteredTasks = filterTasks(filterOption);
        panel.webview.html = getWebviewContent(filteredTasks);
    }
}

function filterTasks(option) {
    if (!option) return tasks;
    switch (option) {
        case 'Выполненные':
            return tasks.filter(task => task.completed);
        case 'Невыполненные':
            return tasks.filter(task => !task.completed);
        default:
            return tasks;
    }
}

function toggleTask(id) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed;
        updateTasksView();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(task => task.id !== id);
    updateTasksView();
}

function getWebviewContent(tasks) {
    return `
    <html>
    <head>
        <title>To-Do List</title>
    </head>
    <body>
        <h1>Список задач</h1>
        <ul>
            ${tasks.map(task => `
                <li>
                    <span>${task.completed ? "[✓]" : "[ ]"} ${task.description}</span>
                    <button onclick="toggleTask(${task.id})">Сменить статус</button>
                    <button onclick="deleteTask(${task.id})">Удалить</button>
                </li>
            `).join('')}
        </ul>
        <script>
            const vscode = acquireVsCodeApi();
            function toggleTask(id) {
                vscode.postMessage({ command: 'toggleTask', id });
            }
            function deleteTask(id) {
                vscode.postMessage({ command: 'deleteTask', id });
            }
        </script>
    </body>
    </html>
    `;
}

function deactivate() {}