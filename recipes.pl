% Khai báo dynamic predicates để có thể thêm/sửa/xóa
:- dynamic recipe/2.
:- dynamic replacement/2.

% Định nghĩa các công thức món ăn
recipe('Salad Rau Tron', ['rau', 'dua leo', 'ca chua']).
recipe('Trung Chien', ['trung', 'hanh']).
recipe('Ga Ran', ['thit ga', 'bot']).
recipe('Pho Bo', ['thit bo', 'banh pho', 'rau thom', 'hanh', 'que']).
recipe('Bun Cha', ['thit heo', 'bun', 'rau song', 'nuoc mam', 'toi', 'ot']).
recipe('Com Chien Hai San', ['com', 'tom', 'muc', 'trung', 'hanh']).
recipe('Mi Xao Hai San', ['mi', 'tom', 'muc', 'rau cai', 'hanh', 'toi']).
recipe('Lau Thai', ['tom', 'muc', 'thit bo', 'nam', 'rau thom', 'sa', 'la chanh']).
recipe('Lau Hai San', ['tom', 'muc', 'ca', 'nam', 'rau thom', 'sa', 'la chanh', 'nuoc mam']).
recipe('Banh Mi Xiu Mai', ['banh mi', 'thit heo', 'hanh', 'toi', 'nuoc mam', 'ot']).
recipe('Ga Nuong Mat Ong', ['thit ga', 'mat ong', 'hanh', 'toi', 'nuoc mam', 'ot']).
recipe('Com Ga Hoi An', ['com', 'thit ga', 'rau song', 'nuoc mam', 'hanh', 'toi']).
recipe('Canh Chua Ca', ['ca', 'dua chua', 'ca chua', 'rau thom', 'nuoc mam']).
recipe('Thit Kho Tau', ['thit heo', 'nuoc mam', 'duong', 'hanh', 'toi']).
recipe('Ca Kho To', ['ca', 'nuoc mam', 'duong', 'hanh', 'toi', 'ot']).
recipe('Rau Muong Xao', ['rau muong', 'toi', 'nuoc mam']).
recipe('Canh Rau Cai', ['rau cai', 'thit heo', 'nuoc mam', 'hanh']).
recipe('Com Tam', ['com', 'thit heo', 'rau song', 'nuoc mam', 'hanh']).
recipe('Bun Bo Hue', ['bun', 'thit bo', 'cha', 'rau song', 'nuoc mam', 'hanh', 'toi']).
recipe('Banh Xeo', ['bot', 'trung', 'tom', 'thit heo', 'rau song', 'nuoc mam']).
recipe('Coca', ['chanh', 'duong', 'soda']).
recipe('canh chua ca loc', ['ca loc', 'la giang', 'muoi', 'duong', 'bot ngot']).
recipe('Thit Luoc Mam Nem', ['thit ba chi', 'mam nem']).
recipe('Com Chien Duong Chau', ['com', 'trung', 'cha', 'ca chua', 'nuoc tuong', 'hanh']).
recipe('Bo Hap Nuoc Dua', ['thit bo', 'nuoc dua']).
recipe('Cha Ram Tom Dat', ['banh trang', 'tom dat', 'thit xay', 'nam']).
recipe('Banh Mi Nuong Muoi Ot', ['banh mi', 'xuc xich', 'cha', 'nem', 'cha bong', 'kho muc', 'tuong ot']).

% Định nghĩa các nguyên liệu thay thế
replacement('thit ga', 'thit bo').
replacement('thit ga', 'thit heo').
replacement('thit heo', 'thit bo').
replacement('thit heo', 'thit ga').
replacement('thit bo', 'thit heo').
replacement('thit bo', 'thit ga').
replacement('nuoc mam', 'tuong').
replacement('tuong', 'nuoc mam').
replacement('ca chua', 'dua chua').
replacement('dua chua', 'ca chua').
replacement('hanh', 'toi').
replacement('toi', 'hanh').
replacement('rau thom', 'rau song').
replacement('rau song', 'rau thom').
replacement('banh pho', 'bun').
replacement('bun', 'banh pho').
replacement('mi', 'bun').
replacement('bun', 'mi').
replacement('thit ga', 'thit vit').
replacement('ca chua', 'ot').
replacement('com', 'xoi').
replacement('kho muc', 'kho ga').

% Kiểm tra xem danh sách nguyên liệu có thể bao gồm cả nguyên liệu thay thế
ingredient_available(Ingredient, Ingredients) :-
    member(Ingredient, Ingredients).
ingredient_available(Ingredient, Ingredients) :-
    replacement(Ingredient, Alternative),
    member(Alternative, Ingredients).

% Kiểm tra nếu tất cả nguyên liệu (hoặc thay thế của chúng) đều có trong danh sách nguyên liệu
all_ingredients_available([], _).
all_ingredients_available([H | T], Ingredients) :-
    ingredient_available(H, Ingredients),
    all_ingredients_available(T, Ingredients).

% Gợi ý món ăn với hỗ trợ thay thế nguyên liệu
suggest_recipe(Ingredients, Recipe) :-
    recipe(Recipe, Required),
    all_ingredients_available(Required, Ingredients).

% Gợi ý món ăn với tổ hợp nguyên liệu thực tế đã dùng (có thể là thay thế, sinh mọi tổ hợp)
suggest_recipe_with_used_ingredients(Available, Recipe, UsedIngredients) :-
    recipe(Recipe, Required),
    all_ingredients_combinations(Required, Available, UsedIngredients),
    \+ member(missing, UsedIngredients).

% all_ingredients_combinations: sinh ra mọi tổ hợp dùng member hoặc replacement
all_ingredients_combinations([], _, []).
all_ingredients_combinations([Req|Rest], Available, [Used|UsedRest]) :-
    (member(Req, Available), Used = Req;
     replacement(Req, Alt), member(Alt, Available), Used = Alt),
    all_ingredients_combinations(Rest, Available, UsedRest).

% Lấy danh sách tất cả món ăn
get_all_recipes(Recipes) :-
    findall(Recipe, recipe(Recipe, _), Recipes).

% Lấy danh sách tất cả nguyên liệu
get_all_ingredients(Ingredients) :-
    findall(Ingredient, (recipe(_, RecipeIngredients), member(Ingredient, RecipeIngredients)), AllIngredients),
    sort(AllIngredients, Ingredients).

% Lấy công thức của một món ăn
get_recipe_ingredients(RecipeName, Ingredients) :-
    recipe(RecipeName, Ingredients).

% Lấy các nguyên liệu thay thế cho một nguyên liệu
get_replacements(Ingredient, Replacements) :-
    findall(Replacement, replacement(Ingredient, Replacement), Replacements).

% Thêm món ăn mới
add_recipe(RecipeName, Ingredients) :-
    assertz(recipe(RecipeName, Ingredients)).

% Thêm nguyên liệu thay thế mới
add_replacement(Ingredient, Alternative) :-
    assertz(replacement(Ingredient, Alternative)).

% Lấy thông tin chi tiết về nguyên liệu được sử dụng (bao gồm thay thế)
get_recipe_usage_info(RecipeName, AvailableIngredients, UsageInfo) :-
    recipe(RecipeName, RequiredIngredients),
    get_usage_info(RequiredIngredients, AvailableIngredients, UsageInfo).

% Xác định nguyên liệu nào được sử dụng thực tế và nguyên liệu nào được thay thế
get_usage_info([], _, []).
get_usage_info([Required | Rest], Available, [Usage | UsageRest]) :-
    (member(Required, Available) ->
        Usage = [Required, Required, 'direct']  % [Required, Used, Type]
    ;
        replacement(Required, Alternative),
        member(Alternative, Available) ->
        Usage = [Required, Alternative, 'replacement']  % [Required, Used, Type]
    ;
        Usage = [Required, Required, 'missing']  % [Required, Used, Type]
    ),
    get_usage_info(Rest, Available, UsageRest). 