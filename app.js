// Configuración de Firebase usando variables de entorno
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', function() {
    const taskForm = document.getElementById('task-form');
    const taskInput = document.getElementById('task-input');
    const taskList = document.getElementById('task-list');
    const menuBtn = document.getElementById('menu-btn');
    const menu = document.getElementById('menu');
    const themeSelect = document.getElementById('theme-select');
    const listNameInput = document.getElementById('list-name');
    const createListBtn = document.getElementById('create-list-btn');
    const listSelector = document.getElementById('list-selector');
    const saveBtn = document.getElementById('save-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const todoTitle = document.getElementById('todo-title');

    let currentListId = null;

    menuBtn.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    createListBtn.addEventListener('click', () => {
        const newName = listNameInput.value.trim();
        if (newName && auth.currentUser) {
            createList(newName);
            listNameInput.value = '';
        }
    });

    listSelector.addEventListener('change', () => {
        currentListId = listSelector.value;
        const selectedListName = listSelector.options[listSelector.selectedIndex].text;
        todoTitle.textContent = selectedListName;
        getTasks(currentListId);
    });

    saveBtn.addEventListener('click', () => {
        const selectedTheme = themeSelect.value;
        const newName = listNameInput.value;

        if (auth.currentUser) {
            const userSettingsRef = db.collection('userSettings').doc(auth.currentUser.uid);
            userSettingsRef.set({
                selectedTheme,
                listName: newName
            }).then(() => {
                console.log("User settings saved!");
            }).catch(error => {
                console.error("Error saving user settings:", error);
            });
        }

        applyTheme(selectedTheme);
        localStorage.setItem('selectedTheme', selectedTheme);

        if (newName) {
            todoTitle.textContent = newName;
            localStorage.setItem('listName', newName);
        }
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            console.log("User logged out");
            document.getElementById('login-container').style.display = 'block';
            document.querySelector('.container').style.display = 'none';
        }).catch(error => {
            console.error("Error logging out:", error);
        });
    });

    function applyTheme(theme) {
        document.body.className = theme;
    }

    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

    function login() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!validateEmail(email)) {
            alert("Invalid email format");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters long");
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("Logged in:", userCredential.user);
                loadLists();
                getUserSettings();
            })
            .catch(error => {
                console.error("Error logging in:", error);
                alert(error.message);
            });
    }

    function register() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!validateEmail(email)) {
            alert("Invalid email format");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters long");
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then(userCredential => {
                console.log("Registered:", userCredential.user);
                loadLists();
                getUserSettings();
            })
            .catch(error => {
                console.error("Error registering:", error);
                alert(error.message);
            });
    }

    function createList(name) {
        const user = auth.currentUser;
        db.collection('lists').add({
            name: name,
            userId: user.uid,
            createdAt: new Date()
        }).then(docRef => {
            console.log("List created with ID: ", docRef.id);
            loadLists();
        }).catch(error => {
            console.error("Error creating list:", error);
        });
    }

    function loadLists() {
        const user = auth.currentUser;
        const q = db.collection('lists')
                    .where('userId', '==', user.uid)
                    .orderBy('createdAt', 'asc');
        q.onSnapshot(snapshot => {
            const lists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderLists(lists);
        }, error => {
            console.error("Error fetching lists:", error);
        });
    }

    function renderLists(lists) {
        listSelector.innerHTML = '';
        lists.forEach(list => {
            const option = document.createElement('option');
            option.value = list.id;
            option.textContent = list.name;
            listSelector.appendChild(option);
        });

        // Auto-select the first list and load its tasks
        if (lists.length > 0) {
            listSelector.value = lists[0].id;
            currentListId = lists[0].id;
            todoTitle.textContent = lists[0].name;
            getTasks(currentListId);
        }
    }

    function saveTask(task) {
        const user = auth.currentUser;
        db.collection('tasks').add({
            userId: user.uid,
            listId: currentListId,
            task: task,
            completed: false,
            order: taskList.children.length,
            createdAt: new Date()
        }).then(() => {
            console.log("Task saved!");
        }).catch(error => {
            console.error("Error saving task:", error);
        });
    }

    function getTasks(listId) {
        const user = auth.currentUser;
        const q = db.collection('tasks')
                    .where('userId', '==', user.uid)
                    .where('listId', '==', listId)
                    .orderBy('order', 'asc');
        q.onSnapshot(snapshot => {
            const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            renderTasks(tasks);
            checkAllTasksCompleted(tasks);
        }, error => {
            console.error("Error fetching tasks:", error);
        });
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = task.completed ? 'completed' : '';
            taskItem.draggable = true;
            taskItem.dataset.id = task.id;

            taskItem.addEventListener('dragstart', handleDragStart);
            taskItem.addEventListener('dragover', handleDragOver);
            taskItem.addEventListener('drop', handleDrop);

            const taskName = document.createElement('span');
            taskName.textContent = task.task;
            taskName.contentEditable = true;
            taskName.addEventListener('blur', () => {
                updateTaskName(task.id, taskName.textContent);
            });

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = task.completed;
            checkbox.addEventListener('change', () => {
                updateTaskStatus(task.id, checkbox.checked);
                taskItem.className = checkbox.checked ? 'completed' : '';
                checkAllTasksCompleted(tasks);
            });

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'X';
            deleteButton.className = 'delete-btn';
            deleteButton.addEventListener('click', () => {
                deleteTask(task.id);
            });

            taskItem.appendChild(checkbox);
            taskItem.appendChild(taskName);
            taskItem.appendChild(deleteButton);
            taskList.appendChild(taskItem);
        });
    }

    function handleDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.id);
    }

    function handleDragOver(event) {
        event.preventDefault();
    }

    function handleDrop(event) {
        event.preventDefault();
        const draggedTaskId = event.dataTransfer.getData('text/plain');
        const targetTaskId = event.currentTarget.dataset.id;

        if (draggedTaskId !== targetTaskId) {
            const draggedTask = document.querySelector(`[data-id='${draggedTaskId}']`);
            const targetTask = document.querySelector(`[data-id='${targetTaskId}']`);
            const allTasks = [...taskList.querySelectorAll('li')];
            const draggedIndex = allTasks.indexOf(draggedTask);
            const targetIndex = allTasks.indexOf(targetTask);

            if (draggedIndex > targetIndex) {
                taskList.insertBefore(draggedTask, targetTask);
            } else {
                taskList.insertBefore(draggedTask, targetTask.nextSibling);
            }

            updateTaskOrder();
        }
    }

    function updateTaskOrder() {
        const allTasks = taskList.querySelectorAll('li');
        allTasks.forEach((taskItem, index) => {
            const taskId = taskItem.dataset.id;
            const taskDoc = db.collection('tasks').doc(taskId);
            taskDoc.update({ order: index }).then(() => {
                console.log("Task order updated!");
            }).catch(error => {
                console.error("Error updating task order:", error);
            });
        });
    }

    function checkAllTasksCompleted(tasks) {
        const allCompleted = tasks.every(task => task.completed);
        if (allCompleted && tasks.length > 0) {
            launchConfetti();
        }
    }

    function launchConfetti() {
        const duration = 5 * 1000;
        const end = Date.now() + duration;

        (function frame() {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 }
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 }
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        })();
    }

    function updateTaskName(taskId, newName) {
        const taskDoc = db.collection('tasks').doc(taskId);
        taskDoc.update({ task: newName }).then(() => {
            console.log("Task name updated!");
        }).catch(error => {
            console.error("Error updating task name:", error);
        });
    }

    function updateTaskStatus(taskId, completed) {
        const taskDoc = db.collection('tasks').doc(taskId);
        taskDoc.update({ completed: completed }).then(() => {
            console.log("Task status updated!");
        }).catch(error => {
            console.error("Error updating task status:", error);
        });
    }

    function deleteTask(taskId) {
        db.collection('tasks').doc(taskId).delete()
            .then(() => {
                console.log("Task deleted!");
            })
            .catch(error => {
                console.error("Error deleting task:", error);
            });
    }

    function getUserSettings() {
        const user = auth.currentUser;
        const userSettingsRef = db.collection('userSettings').doc(user.uid);
        userSettingsRef.get().then(docSnap => {
            if (docSnap.exists()) {
                const settings = docSnap.data();
                applyTheme(settings.selectedTheme);
                todoTitle.textContent = settings.listName;
                themeSelect.value = settings.selectedTheme;
                listNameInput.value = settings.listName;
            }
        }).catch(error => {
            console.error("Error fetching user settings:", error);
        });
    }

    taskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const taskText = taskInput.value;
        if (taskText && currentListId) {
            saveTask(taskText);
            taskInput.value = '';
        }
    });

    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("User logged in:", user);
            document.getElementById('login-container').style.display = 'none';
            document.querySelector('.container').style.display = 'block';
            loadLists();
            getUserSettings();
        } else {
            console.log("No user is logged in");
            document.getElementById('login-container').style.display = 'block';
            document.querySelector('.container').style.display = 'none';
        }
    });

    function loadSettings() {
        const selectedTheme = localStorage.getItem('selectedTheme');
        const savedName = localStorage.getItem('listName');

        if (selectedTheme) {
            applyTheme(selectedTheme);
            themeSelect.value = selectedTheme;
        }

        if (savedName) {
            todoTitle.textContent = savedName;
            listNameInput.value = savedName;
        }
    }
});
