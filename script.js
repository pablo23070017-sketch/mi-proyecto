const loginBtn = document.getElementById("loginBtn");
const crearBtn = document.getElementById("crearBtn");
const loginAdminBtn = document.getElementById("loginAdminBtn");
const crearAdminBtn = document.getElementById("crearAdminBtn");

// Función para obtener los datos de los inputs de forma limpia
const obtenerDatos = () => {
    const inputs = document.querySelectorAll("input");
    return {
        id: inputs[0].value,
        usuario: inputs[1].value,
        correo: inputs[2].value,
        password: inputs[3].value
    };
};

// --- SECCIÓN MESEROS ---

// LOGIN MESERO
loginBtn.addEventListener("click", () => {
    const { usuario, password } = obtenerDatos();
    let usuarios = JSON.parse(localStorage.getItem("meseros")) || [];

    let encontrado = usuarios.find(u => u.usuario === usuario && u.password === password);

    if (encontrado) {
        localStorage.setItem("sesion", JSON.stringify(encontrado));
        alert("¡Bienvenido Mesero! Entrando al panel de pedidos...");
        window.location.href = "panel.html"; // Panel enfocado a mesero
    } else {
        alert("Datos de mesero incorrectos");
    }
});

// CREAR CUENTA MESERO
crearBtn.addEventListener("click", () => {
    const { id, usuario, correo, password } = obtenerDatos();

    if (!id || !usuario || !correo || !password) {
        alert("Completa todos los campos para el mesero");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem("meseros")) || [];
    if (usuarios.find(u => u.usuario === usuario)) {
        alert("Este mesero ya existe");
        return;
    }

    usuarios.push({ id, usuario, correo, password });
    localStorage.setItem("meseros", JSON.stringify(usuarios));
    alert("Cuenta de mesero creada correctamente");
});

// --- SECCIÓN ADMINISTRADORES ---

// LOGIN ADMIN
loginAdminBtn.addEventListener("click", () => {
    const { usuario, password } = obtenerDatos();

    // Primero revisamos el Admin Maestro (hardcoded)
    if (usuario === "admin" && password === "123") {
        localStorage.setItem("sesion", JSON.stringify({ usuario: "admin", correo: "admin@email.com" }));
        alert("Bienvenido Administrador Maestro");
        window.location.href = "admin.html";
        return;
    }

    // Luego revisamos admins creados en localStorage
    let admins = JSON.parse(localStorage.getItem("admins")) || [];
    let encontrado = admins.find(a => a.usuario === usuario && a.password === password);

    if (encontrado) {
        localStorage.setItem("sesion", JSON.stringify(encontrado));
        alert("Bienvenido Administrador");
        window.location.href = "admin.html";
    } else {
        alert("Datos de administrador incorrectos");
    }
});

// CREAR CUENTA ADMIN
crearAdminBtn.addEventListener("click", () => {
    const { id, usuario, correo, password } = obtenerDatos();

    if (!id || !usuario || !correo || !password) {
        alert("Completa todos los campos para el nuevo Admin");
        return;
    }

    let admins = JSON.parse(localStorage.getItem("admins")) || [];
    if (admins.find(a => a.usuario === usuario)) {
        alert("Este administrador ya existe");
        return;
    }

    admins.push({ id, usuario, correo, password });
    localStorage.setItem("admins", JSON.stringify(admins));
    alert("Cuenta de administrador creada con éxito");
});