// Decode a maintainer-pinned flat cache with RuneLite's cache library.
// Output stays outside the repository; only reviewed release assets are shipped.
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import javax.imageio.ImageIO;
import net.runelite.cache.*;
import net.runelite.cache.definitions.*;
import net.runelite.cache.definitions.loaders.*;
import net.runelite.cache.definitions.providers.ModelProvider;
import net.runelite.cache.fs.*;
import net.runelite.cache.fs.flat.FlatStorage;
import net.runelite.cache.item.ItemSpriteFactory;

public class ExtractCatalog {
    static final Gson JSON = new GsonBuilder().setPrettyPrinting().disableHtmlEscaping().create();
    public static void main(String[] args) throws Exception {
        Path out = Path.of(args[1]);
        Files.createDirectories(out);
        try (Store store = new Store(new FlatStorage(new File(args[0])))) {
            store.load();
            ItemManager items = new ItemManager(store);
            items.load();
            Files.writeString(out.resolve("items.json"), JSON.toJson(items.getItems()) + "\n");
            List<Object> enums = new ArrayList<>(), structs = new ArrayList<>();
            Index config = store.getIndex(IndexType.CONFIGS);
            for (ConfigType type : new ConfigType[]{ConfigType.ENUM, ConfigType.STRUCT}) {
                Archive archive = config.getArchive(type.getId());
                ArchiveFiles files = archive.getFiles(store.getStorage().loadArchive(archive));
                for (FSFile file : files.getFiles()) {
                    if (type == ConfigType.ENUM) enums.add(new EnumLoader().load(file.getFileId(), file.getContents()));
                    else structs.add(new StructLoader().load(file.getFileId(), file.getContents()));
                }
            }
            Files.writeString(out.resolve("enums.json"), JSON.toJson(enums) + "\n");
            Files.writeString(out.resolve("structs.json"), JSON.toJson(structs) + "\n");
            System.out.println("Decoded " + items.getItems().size() + " items, " + enums.size() + " enums, " + structs.size() + " structs");
            if (args.length < 3) return;
            items.link();
            SpriteManager sprites = new SpriteManager(store);
            sprites.load();
            TextureManager textures = new TextureManager(store);
            textures.load();
            ModelProvider models = id -> {
                Archive archive = store.getIndex(IndexType.MODELS).getArchive(id);
                if (archive == null) throw new IllegalArgumentException("Missing model " + id);
                byte[] bytes = archive.decompress(store.getStorage().loadArchive(archive));
                return new ModelLoader().load(id, bytes);
            };
            for (int i = 2; i < args.length; i++) {
                int id = Integer.parseInt(args[i]);
                var image = ItemSpriteFactory.createSprite(items, models, sprites, textures, id, 1, 1, 3153952, false);
                if (image == null) throw new IllegalArgumentException("Missing sprite " + id);
                ImageIO.write(image, "PNG", out.resolve(id + ".png").toFile());
                System.out.println(id + " " + items.getItem(id).name + " " + image.getWidth() + "x" + image.getHeight());
            }
        }
    }
}
