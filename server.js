const express = require("express");
const bodyParser = require("body-parser");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static("public"));

// Hàm helper để chạy lệnh Prolog
function runPrologQuery(query) {
    return new Promise((resolve, reject) => {
        exec(`swipl -s recipes.pl -g "${query}" -t halt`, (error, stdout, stderr) => {
            if (error) {
                console.error("Prolog error:", error);
                reject(error);
                return;
            }
            resolve(stdout.trim());
        });
    });
}

// Hàm helper để lưu món ăn mới vào file
function saveRecipeToFile(name, ingredients) {
    try {
        const ingredientsList = ingredients.map(ing => `'${ing}'`).join(", ");
        const newRecipe = `recipe('${name}', [${ingredientsList}]).`;
        
        // Đọc file hiện tại
        let content = fs.readFileSync('recipes.pl', 'utf8');
        
        // Tìm vị trí cuối của phần định nghĩa món ăn (trước phần replacement)
        const lines = content.split('\n');
        let insertIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('% Định nghĩa các nguyên liệu thay thế')) {
                insertIndex = i - 1; // Thêm trước dòng comment này
                break;
            }
        }
        
        if (insertIndex === -1) {
            // Nếu không tìm thấy, thêm vào cuối file
            insertIndex = lines.length - 1;
        }
        
        // Thêm món ăn mới
        lines.splice(insertIndex, 0, newRecipe);
        
        // Ghi lại file
        fs.writeFileSync('recipes.pl', lines.join('\n'));
        
        console.log(`Recipe "${name}" saved to file`);
    } catch (error) {
        console.error('Error saving recipe to file:', error);
        throw error;
    }
}

// Hàm helper để lưu nguyên liệu thay thế mới vào file
function saveReplacementToFile(ingredient, alternative) {
    try {
        const newReplacement = `replacement('${ingredient}', '${alternative}').`;
        
        // Đọc file hiện tại
        let content = fs.readFileSync('recipes.pl', 'utf8');
        
        // Tìm vị trí cuối của phần định nghĩa replacement (trước phần logic)
        const lines = content.split('\n');
        let insertIndex = -1;
        
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes('% Kiểm tra xem danh sách nguyên liệu')) {
                insertIndex = i - 1; // Thêm trước dòng comment này
                break;
            }
        }
        
        if (insertIndex === -1) {
            // Nếu không tìm thấy, thêm vào cuối file
            insertIndex = lines.length - 1;
        }
        
        // Thêm nguyên liệu thay thế mới
        lines.splice(insertIndex, 0, newReplacement);
        
        // Ghi lại file
        fs.writeFileSync('recipes.pl', lines.join('\n'));
        
        console.log(`Replacement "${ingredient}" -> "${alternative}" saved to file`);
    } catch (error) {
        console.error('Error saving replacement to file:', error);
        throw error;
    }
}

// API để đề xuất món ăn (trả về cả tổ hợp nguyên liệu thực tế đã dùng)
app.post("/api/suggest", async (req, res) => {
    try {
        const ingredients = req.body.ingredients;
        if (!ingredients || !Array.isArray(ingredients)) {
            return res.status(400).json({ error: "Ingredients must be an array" });
        }

        const ingredientsList = ingredients.map(ing => `'${ing}'`).join(",");
        // Query mới: lấy cả Recipe và UsedIngredients
        const query = `findall([R,U], suggest_recipe_with_used_ingredients([${ingredientsList}], R, U), List), writeln(List).`;
        const result = await runPrologQuery(query);
        // Parse kết quả dạng [[Recipe,[used1,used2,...]], ...]
        const suggestions = [];
        const matches = result.match(/\[([^\[\]]+),\[([^\[\]]*)\]\]/g);
        if (matches) {
            matches.forEach(match => {
                // match: [Recipe,[used1,used2,...]]
                const parts = match.match(/\[([^,]+),\[(.*)\]\]/);
                if (parts && parts.length === 3) {
                    const recipe = parts[1].replace(/'/g, '').trim();
                    const usedIngredients = parts[2].split(',').map(s => s.replace(/'/g, '').trim()).filter(Boolean);
                    suggestions.push({ recipe, usedIngredients });
                }
            });
        }
        res.json({ suggestions });
    } catch (error) {
        console.error("Error suggesting recipes:", error);
        res.status(500).json({ error: "Failed to suggest recipes" });
    }
});

// API để lấy tất cả món ăn
app.get("/api/recipes", async (req, res) => {
    try {
        const result = await runPrologQuery("get_all_recipes(List), writeln(List).");
        const recipes = result.replace(/\[|\]|'/g, "").split(",").map(r => r.trim()).filter(r => r);
        res.json({ recipes });
    } catch (error) {
        console.error("Error getting recipes:", error);
        res.status(500).json({ error: "Failed to get recipes" });
    }
});

// API để lấy tất cả nguyên liệu
app.get("/api/ingredients", async (req, res) => {
    try {
        const result = await runPrologQuery("get_all_ingredients(List), writeln(List).");
        const ingredients = result.replace(/\[|\]|'/g, "").split(",").map(i => i.trim()).filter(i => i);
        res.json({ ingredients });
    } catch (error) {
        console.error("Error getting ingredients:", error);
        res.status(500).json({ error: "Failed to get ingredients" });
    }
});

// API để lấy công thức của một món ăn
app.get("/api/recipe/:name", async (req, res) => {
    try {
        const recipeName = req.params.name;
        const query = `get_recipe_ingredients('${recipeName}', List), writeln(List).`;
        const result = await runPrologQuery(query);
        const ingredients = result.replace(/\[|\]|'/g, "").split(",").map(i => i.trim()).filter(i => i);
        res.json({ recipe: recipeName, ingredients });
    } catch (error) {
        console.error("Error getting recipe:", error);
        res.status(500).json({ error: "Failed to get recipe" });
    }
});

// API để lấy tất cả nguyên liệu thay thế
app.get("/api/replacements", async (req, res) => {
    try {
        const result = await runPrologQuery("findall([I,A], replacement(I,A), List), writeln(List).");
        const replacements = [];
        
        // Parse kết quả từ Prolog
        const matches = result.match(/\[([^,\]]+),([^,\]]+)\]/g);
        if (matches) {
            matches.forEach(match => {
                const [ingredient, alternative] = match.replace(/[\[\]']/g, '').split(',');
                replacements.push({ ingredient: ingredient.trim(), alternative: alternative.trim() });
            });
        }
        
        res.json({ replacements });
    } catch (error) {
        console.error("Error getting all replacements:", error);
        res.status(500).json({ error: "Failed to get replacements" });
    }
});

// API để kiểm tra món ăn đã tồn tại
app.get("/api/recipe/exists/:name", async (req, res) => {
    try {
        const recipeName = req.params.name;
        const query = `recipe('${recipeName}', _), writeln('exists').`;
        
        try {
            await runPrologQuery(query);
            res.json({ exists: true });
        } catch (error) {
            res.json({ exists: false });
        }
    } catch (error) {
        console.error("Error checking recipe existence:", error);
        res.status(500).json({ error: "Failed to check recipe" });
    }
});

// API để kiểm tra nguyên liệu thay thế đã tồn tại
app.get("/api/replacement/exists/:ingredient/:alternative", async (req, res) => {
    try {
        const { ingredient, alternative } = req.params;
        const query = `replacement('${ingredient}', '${alternative}'), writeln('exists').`;
        
        try {
            await runPrologQuery(query);
            res.json({ exists: true });
        } catch (error) {
            res.json({ exists: false });
        }
    } catch (error) {
        console.error("Error checking replacement existence:", error);
        res.status(500).json({ error: "Failed to check replacement" });
    }
});

// API để thêm món ăn mới
app.post("/api/recipe", async (req, res) => {
    try {
        const { name, ingredients } = req.body;
        if (!name || !ingredients || !Array.isArray(ingredients)) {
            return res.status(400).json({ error: "Name and ingredients array are required" });
        }

        // Kiểm tra món ăn đã tồn tại chưa
        const existsQuery = `recipe('${name}', _), writeln('exists').`;
        try {
            await runPrologQuery(existsQuery);
            return res.status(400).json({ error: `Món ăn "${name}" đã tồn tại trong hệ thống` });
        } catch (error) {
            // Món ăn chưa tồn tại, tiếp tục thêm
        }

        const ingredientsList = ingredients.map(ing => `'${ing}'`).join(",");
        const query = `add_recipe('${name}', [${ingredientsList}]), writeln('Recipe added successfully').`;
        
        await runPrologQuery(query);
        
        // Lưu vào file để giữ lại sau khi restart
        saveRecipeToFile(name, ingredients);
        
        res.json({ message: "Recipe added successfully and saved to file" });
    } catch (error) {
        console.error("Error adding recipe:", error);
        res.status(500).json({ error: "Failed to add recipe" });
    }
});

// API để thêm nguyên liệu thay thế mới
app.post("/api/replacement", async (req, res) => {
    try {
        const { ingredient, alternative } = req.body;
        if (!ingredient || !alternative) {
            return res.status(400).json({ error: "Ingredient and alternative are required" });
        }

        // Kiểm tra nguyên liệu thay thế đã tồn tại chưa
        const existsQuery = `replacement('${ingredient}', '${alternative}'), writeln('exists').`;
        try {
            await runPrologQuery(existsQuery);
            return res.status(400).json({ error: `Nguyên liệu thay thế "${ingredient}" -> "${alternative}" đã tồn tại` });
        } catch (error) {
            // Nguyên liệu thay thế chưa tồn tại, tiếp tục thêm
        }

        const query = `add_replacement('${ingredient}', '${alternative}'), writeln('Replacement added successfully').`;
        
        await runPrologQuery(query);
        
        // Lưu vào file để giữ lại sau khi restart
        saveReplacementToFile(ingredient, alternative);
        
        res.json({ message: "Replacement added successfully and saved to file" });
    } catch (error) {
        console.error("Error adding replacement:", error);
        res.status(500).json({ error: "Failed to add replacement" });
    }
});

// API để lấy thông tin chi tiết về nguyên liệu được sử dụng
app.get("/api/recipe/:name/usage", async (req, res) => {
    try {
        const recipeName = req.params.name;
        const ingredients = req.query.ingredients ? req.query.ingredients.split(',') : [];
        
        if (ingredients.length === 0) {
            // Nếu không có nguyên liệu, trả về công thức gốc
            const query = `get_recipe_ingredients('${recipeName}', List), writeln(List).`;
            const result = await runPrologQuery(query);
            const recipeIngredients = result.replace(/\[|\]|'/g, "").split(",").map(i => i.trim()).filter(i => i);
            
            const usageInfo = recipeIngredients.map(ing => ({
                required: ing,
                used: ing,
                type: 'original'
            }));
            
            res.json({ 
                recipe: recipeName, 
                usageInfo,
                message: 'Công thức gốc của món ăn'
            });
        } else {
            // Nếu có nguyên liệu, phân tích cách sử dụng
            const ingredientsList = ingredients.map(ing => `'${ing}'`).join(",");
            const query = `get_recipe_usage_info('${recipeName}', [${ingredientsList}], List), writeln(List).`;
            
            const result = await runPrologQuery(query);
            
            // Parse kết quả từ Prolog
            const usageInfo = [];
            const matches = result.match(/\[([^,\]]+),([^,\]]+),([^,\]]+)\]/g);
            
            if (matches) {
                matches.forEach(match => {
                    const [required, used, type] = match.replace(/[\[\]']/g, '').split(',');
                    usageInfo.push({
                        required: required.trim(),
                        used: used.trim(),
                        type: type.trim()
                    });
                });
            }
            
            res.json({ 
                recipe: recipeName, 
                usageInfo,
                availableIngredients: ingredients,
                message: 'Thông tin sử dụng nguyên liệu'
            });
        }
    } catch (error) {
        console.error("Error getting recipe usage info:", error);
        res.status(500).json({ error: "Failed to get recipe usage info" });
    }
});

// Route chính
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Khởi động server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log("Make sure SWI-Prolog is installed and accessible from command line");
}); 