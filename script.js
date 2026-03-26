const loginBtn = document.getElementById("loginBtn");
const crearBtn = document.getElementById("crearBtn");

// LOGIN
loginBtn.addEventListener("click", () => {
    const id = document.querySelectorAll("input")[0].value;
    const usuario = document.querySelectorAll("input")[1].value;
    const correo = document.querySelectorAll("input")[2].value;
    const contraseña = document.querySelectorAll("input")[3].value;

    // ADMIN (solo uno)
    if (usuario === "admin" && contraseña === "123") {
        alert("Bienvenido Administrador");
        window.location.href = "admin.html";
        return;
    }

    // MESEROS GUARDADOS
    let usuarios = JSON.parse(localStorage.getItem("meseros")) || [];

    let encontrado = usuarios.find(u => 
        u.usuario === usuario && u.password === contraseña
    );

    if (encontrado) {
        alert("Bienvenido Mesero");
        window.location.href = "mesero.html";
    } else {
        alert("Datos incorrectos");
    }
});

// CREAR CUENTA MESERO
crearBtn.addEventListener("click", () => {
    const id = document.querySelectorAll("input")[0].value;
    const usuario = document.querySelectorAll("input")[1].value;
    const correo = document.querySelectorAll("input")[2].value;
    const contraseña = document.querySelectorAll("input")[3].value;

    if (!id || !usuario || !correo || !contraseña) {
        alert("Completa todos los campos");
        return;
    }

    let usuarios = JSON.parse(localStorage.getItem("meseros")) || [];

    // Evitar duplicados por nombre de usuario
    if (usuarios.find(u => u.usuario === usuario)) {
        alert("Este usuario ya existe, elige otro");
        return;
    }

    usuarios.push({
        id: id,
        usuario: usuario,
        correo: correo,
        password: contraseña
    });

    localStorage.setItem("meseros", JSON.stringify(usuarios));
    alert("Cuenta de mesero creada correctamente");
});