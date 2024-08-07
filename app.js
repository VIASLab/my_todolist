import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, doc, deleteDoc, updateDoc, getDoc, setDoc } from "firebase/firestore";

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
    const saveBtn = document.getElementById('save-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const todoTitle = document.getElementById('todo-title');

    menuBtn.addEventListener('click', () => {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    });

    saveBtn.addEventListener('click', () => {
        const selectedTheme = themeSelect.value;
        const newName = listNameInput.value;

        if (auth.currentUser) {
            const userSettingsRef = doc(db, 'userSettings', auth.currentUser.uid);
            setDoc(userSettingsRef, {
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
        signOut(auth).then(() => {
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

        signInWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                console.log("Logged in:", userCredential.user);
                getUserSettings();
                getTasks();
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

        createUserWithEmailAndPassword(auth, email, password)
            .then(userCredential => {
                console.log("Registered:", userCredential.user);
                getUserSettings();
                getTasks();
            })
            .catch(error => {
                console.error("Error registering:", error);
                alert(error.message);
            });
    }

    function saveTask(task) {
        const user = auth.currentUser;
        addDoc(collection(db, 'tasks'), {
            userId: user.uid,
            task: task,
            completed: false,
            createdAt: new Date()
        }).then(() => {
            console.log("Task saved!");
        }).catch(error => {
            console.error("Error saving task:", error);
        });
    }

    function getTasks() {
        const user = auth.currentUser;
        const q = query(collection(db, 'tasks'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
        onSnapshot(q, snapshot => {
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
                checkAllTasksCompleted(tasks); // Verifica si todas las tareas están completadas
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

    function checkAllTasksCompleted(tasks) {
        const allCompleted = tasks.every(task => task.completed);
        if (allCompleted && tasks.length > 0) {
            launchConfetti();
        }
    }

    function launchConfetti() {
        var duration = 5 * 1000;
        var end = Date.now() + duration;

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
        const taskDoc = doc(db, 'tasks', taskId);
        updateDoc(taskDoc, { task: newName }).then(() => {
            console.log("Task name updated!");
        }).catch(error => {
            console.error("Error updating task name:", error);
        });
    }

    function updateTaskStatus(taskId, completed) {
        const taskDoc = doc(db, 'tasks', taskId);
        updateDoc(taskDoc, { completed: completed }).then(() => {
            console.log("Task status updated!");
        }).catch(error => {
            console.error("Error updating task status:", error);
        });
    }

    function deleteTask(taskId) {
        deleteDoc(doc(db, 'tasks', taskId))
            .then(() => {
                console.log("Task deleted!");
            })
            .catch(error => {
                console.error("Error deleting task:", error);
            });
    }

    function getUserSettings() {
        const user = auth.currentUser;
        const userSettingsRef = doc(db, 'userSettings', user.uid);
        getDoc(userSettingsRef).then(docSnap => {
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
        if (taskText) {
            saveTask(taskText);
            taskInput.value = '';
        }
    });

    onAuthStateChanged(auth, user => {
        if (user) {
            console.log("User logged in:", user);
            document.getElementById('login-container').style.display = 'none';
            document.querySelector('.container').style.display = 'block';
            getUserSettings();
            getTasks();
        } else {
            console.log("No user is logged in");
            document.getElementById('login-container').style.display = 'block';
            document.querySelector('.container').style.display = 'none';
        }
    });

    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('register-btn').addEventListener('click', register);

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
