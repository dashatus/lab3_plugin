import * as vscode from 'vscode';

interface Task {
    id: number;
    description: string;
    completed: boolean;
}

let tasks: Task[] = [];
let taskIdCounter = 0;
let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
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
            updateTasksView(option); // Передаем выбранный вариант фильтрации
        }
    });

    const showTasksCommand = vscode.commands.registerCommand('todo.showTasks', () => {
        if (!panel) {
            panel = vscode.window.createWebviewPanel('todoTasks', 'To-Do List', vscode.ViewColumn.One, {});
            panel.onDidDispose(() => {
                panel = undefined; // Убираем ссылку на панель, когда она закрывается
            });

            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'toggleTask':
                            toggleTask(message.id);
                            return;
                        case 'deleteTask':
                            deleteTask(message.id);
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );

            updateTasksView(); // Инициализируем начальный вид задач
        } else {
            updateTasksView(); // Обновляем вид задач, если панель уже открыта
        }
    });

    context.subscriptions.push(addTaskCommand);
    context.subscriptions.push(filterTasksCommand);
    context.subscriptions.push(showTasksCommand);
}

function updateTasksView(filterOption?: string) {
    if (panel) {
        const filteredTasks = filterTasks(filterOption);
        panel.webview.html = getWebviewContent(filteredTasks);
    }
}

function filterTasks(option?: string): Task[] {
    if (!option) return tasks; // Если фильтр не выбран, вернуть все задачи

    switch (option) {
        case 'Выполненные':
            return tasks.filter(task => task.completed);
        case 'Невыполненные':
            return tasks.filter(task => !task.completed);
        default:
            return tasks; // Если выбраны "Все", вернуть все задачи
    }
}

function toggleTask(id: number) {
    const task = tasks.find(task => task.id === id);
    if (task) {
        task.completed = !task.completed; // Меняем статус выполнения задачи
        updateTasksView(); // Обновляем вид задач
    }
}

function deleteTask(id: number) {
    tasks = tasks.filter(task => task.id !== id); // Удаляем задачу по id
    updateTasksView(); // Обновляем вид задач
}

function getWebviewContent(tasks: Task[]): string {
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

export function deactivate() {}
