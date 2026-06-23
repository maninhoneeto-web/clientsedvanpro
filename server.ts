import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
// Allow large payloads for base64 image uploading
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = 3000;

// Shared Gemini Client with telemetry User-Agent
const geminiApiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API endpoint to parse screenshot or voice transcript
app.post("/api/gemini/parse", async (req, res) => {
  try {
    const { image, text, availableProducts } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: "Chave API do Gemini (GEMINI_API_KEY) não configurada no servidor. Por favor, configure nas Secrets." 
      });
    }

    if (!image && !text) {
      return res.status(400).json({ 
        success: false, 
        error: "Nenhum dado fornecido. Forneça uma imagem em base64 ou um texto de voz." 
      });
    }

    const systemPrompt = `Você é um assistente especialista nos produtos de nutrição animal Adimax/Magnus e em faturamentos de vendas para representantes comerciais.
Seu objetivo é analisar a imagem de print do aplicativo Magnus ou a descrição por voz/texto fornecida e extrair os dados estruturados de venda da forma mais precisa possível.

Se uma lista de produtos disponíveis for fornecida abaixo, compare os nomes encontrados com ela para obter correspondências perfeitas de nome e peso.
Produtos Magnus conhecidos:
${JSON.stringify(availableProducts || [], null, 2)}

Diretrizes adicionais:
1. Identifique o cliente se possível (pode ser uma loja de rações, agropecuária ou nome de pessoa/empresa).
2. Se o ano do pedido não estiver especificado na imagem/texto, use o ano atual.
3. Se o preço de custo não for obtido, tente deduzir com base na lista de produtos fornecida ou retorne 0.
4. Identifique as quantidades corretamente. Em faturas da Magnus, rações geralmente são vendidas por fardos/sacos ou de forma fracionada.
5. Se for outra marca de ração da concorrência, marque 'isMagnus' como false.`;

    const parts: any[] = [];

    if (image) {
      // Clean base64 header if present
      const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: "image/png",
          data: cleanBase64
        }
      });
    }

    const userInstructions = text 
      ? `Instruções/Descrição do Usuário (Áudio/Voz ou Texto):\n"${text}"\n\nPor favor, extraia todos os produtos comprados e faturados.`
      : "Por favor, extraia todos os produtos comprados e faturados presentes neste print do faturamento de rações Magnus.";

    parts.push({ text: userInstructions });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            clientName: {
              type: Type.STRING,
              description: "Nome do cliente/agropecuária se detectado no print ou áudio/texto."
            },
            date: {
              type: Type.STRING,
              description: "Data do pedido se detectada (formato YYYY-MM-DD)."
            },
            notes: {
              type: Type.STRING,
              description: "Observações extras descritas ou observadas (ex: faturamento para 30 dias, prazo de entrega ou desconto)."
            },
            items: {
              type: Type.ARRAY,
              description: "Lista de produtos comprados.",
              items: {
                type: Type.OBJECT,
                properties: {
                  productName: {
                    type: Type.STRING,
                    description: "Nome do produto/ração (vincular ao nome correto do produto Magnus sempre que possível)."
                  },
                  weightKg: {
                    type: Type.NUMBER,
                    description: "Peso da unidade em Kg (ex: 15, 25, 10.1)."
                  },
                  quantity: {
                    type: Type.NUMBER,
                    description: "Quantidade de sacos faturados."
                  },
                  unitCostPrice: {
                    type: Type.NUMBER,
                    description: "Valor unitário de custo para o representante se indicado ou deduzível (pode ser baseado na lista)."
                  },
                  unitSalePrice: {
                    type: Type.NUMBER,
                    description: "Valor unitário de venda cobrado do cliente."
                  },
                  isMagnus: {
                    type: Type.BOOLEAN,
                    description: "Indica se o produto pertence à linha Magnus."
                  }
                },
                required: ["productName", "weightKg", "quantity", "unitSalePrice", "isMagnus"]
              }
            }
          }
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Resposta vazia da inteligência artificial.");
    }

    const parsedData = JSON.parse(textOutput.trim());
    return res.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error("Erro ao analisar com Gemini:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Erro desconhecido ao processar com Gemini Inteligente." 
    });
  }
});

// Serve assets and boot
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
});
