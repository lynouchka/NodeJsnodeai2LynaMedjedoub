# NodeJsnodeai2LynaMedjedoub

## Étape 2 : Streaming SSE avec Fastify + Ollama

### Installation
 
```bash
npm install
```
### Lancement
 
Le modèle `llama3.2` n'a pas pu être installé en raison d'une erreur Ollama (`invalid character '\x00' looking for beginning of value`). Le modèle `tinyllama` a été utilisé à la place.
 
```bash
# Lancer le serveur avec tinyllama
OLLAMA_MODEL=tinyllama npm run dev
```

---

### `POST /chat`
 
```bash
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Dis bonjour en une phrase."}'
```
 
### `POST /chat/stream`
 
```bash
curl -s -N -X POST http://localhost:3000/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message": "Explique le streaming en 3 phrases."}'
```
