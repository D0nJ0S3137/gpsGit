
///////////////////////////////////////////////////////////////////////////////////////////////////////////
pipeline {
    agent any
    
    stages {
        stage('Checkout') {
            steps {
                // Clonar el repositorio de GitHub
                git 'https://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@github.com/oscariglesias21/gpsGit.git'
            }
        }
        stage('Build') {
            steps {
                // Ejecutar comandos de construcción
                sh 'npm install' // Instala las dependencias de Node.js
            }
        }
        stage('Deploy to EC2') {
            steps {
                // Copiar archivos al servidor EC2
                sshagent(['d86712c0-7eb1-4cdc-9134-ed0bc33d2c99']) {
                    sh 'scp -i /home/ubuntu/hammer.pem -r * ubuntu@44.198.179.134:/home/ubuntu/gpsGit'
                }
            }
        }
    }
}

 