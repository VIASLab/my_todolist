import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, query, where, onSnapshot, orderBy, doc, deleteDoc } from "firebase/firestore";

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
        }, error => {
            console.error("Error fetching tasks:", error);
        });
    }

    function renderTasks(tasks) {
        taskList.innerHTML = '';
        tasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.textContent = task.task;

            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => {
                deleteTask(task.id);
            });

            taskItem.appendChild(deleteButton);
            taskList.appendChild(taskItem);
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
            getTasks();
        } else {
            console.log("No user is logged in");
            document.getElementById('login-container').style.display = 'block';
            document.querySelector('.container').style.display = 'none';
        }
    });

    document.getElementById('login-btn').addEventListener('click', login);
    document.getElementById('register-btn').addEventListener('click', register);
});
