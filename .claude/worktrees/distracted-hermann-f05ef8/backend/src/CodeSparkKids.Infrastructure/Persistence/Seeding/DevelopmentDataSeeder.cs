using CodeSparkKids.Domain.Catalog;
using CodeSparkKids.Domain.Entities;
using CodeSparkKids.Domain.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace CodeSparkKids.Infrastructure.Persistence.Seeding;

/// <summary>
/// Development-only, idempotent catalog seed data. Seeds a realistic set of
/// categories, courses (across every publish state and delivery type), and two
/// learning paths so the future UI/QA has something meaningful to work with.
/// <para>
/// Idempotency: every entity is keyed by slug and only inserted when missing,
/// so the seeder can run on every startup without creating duplicates. It must
/// NEVER run in Production — that is enforced by the caller (see Program.cs).
/// Instructor references use fixed placeholder user ids: <see cref="CourseInstructor"/>
/// holds a plain Guid with no FK to the Identity tables, so these are safe.
/// </para>
/// </summary>
public static class DevelopmentDataSeeder
{
    // Stable placeholder instructor ids (no FK enforced — see class remarks).
    private static readonly Guid LeadInstructorA = new("11111111-1111-1111-1111-111111111111");
    private static readonly Guid LeadInstructorB = new("22222222-2222-2222-2222-222222222222");

    public static async Task SeedAsync(AppDbContext db, DateTime nowUtc, CancellationToken ct = default)
    {
        await SeedCategoriesAsync(db, nowUtc, ct);
        await SeedCoursesAsync(db, nowUtc, ct);
        await SeedLearningPathsAsync(db, nowUtc, ct);
    }

    // --- Categories --------------------------------------------------------

    private static async Task SeedCategoriesAsync(AppDbContext db, DateTime nowUtc, CancellationToken ct)
    {
        var existing = await db.Categories.Select(c => c.Slug).ToListAsync(ct);
        var have = existing.ToHashSet();

        var defs = new (string Slug, string NameEn, string NameAr, string DescEn, string DescAr, string Icon, int Order)[]
        {
            ("scratch-block-coding", "Scratch & Block Coding", "سكراتش والبرمجة بالكتل",
                "Drag-and-drop coding that turns ideas into games and stories.",
                "برمجة بالسحب والإفلات تحوّل الأفكار إلى ألعاب وقصص.", "blocks", 1),
            ("web-development", "Web Development", "تطوير الويب",
                "Build real web pages with HTML, CSS, and a little JavaScript.",
                "أنشئ صفحات ويب حقيقية باستخدام HTML وCSS وقليل من جافاسكريبت.", "globe", 2),
            ("python", "Python", "بايثون",
                "Learn one of the world's most popular programming languages.",
                "تعلّم واحدة من أكثر لغات البرمجة شهرة في العالم.", "snake", 3),
            ("game-design", "Game Design", "تصميم الألعاب",
                "Design and build your own playable games from scratch.",
                "صمّم وابنِ ألعابك القابلة للعب من الصفر.", "gamepad", 4),
            ("robotics", "Robotics", "الروبوتات",
                "Program robots and bring hardware to life.",
                "برمج الروبوتات وأضف الحياة إلى العتاد.", "robot", 5),
            ("ai-for-kids", "AI for Kids", "الذكاء الاصطناعي للأطفال",
                "Friendly introduction to how machines learn.",
                "مقدمة مبسطة عن كيفية تعلّم الآلات.", "sparkles", 6),
        };

        foreach (var d in defs)
        {
            if (have.Contains(d.Slug)) continue;
            db.Categories.Add(Category.Create(
                d.Slug,
                LocalizedText.Create(d.NameEn, d.NameAr),
                LocalizedText.Create(d.DescEn, d.DescAr),
                d.Icon, d.Order, nowUtc));
        }

        await db.SaveChangesAsync(ct);
    }

    // --- Courses -----------------------------------------------------------

    private static async Task SeedCoursesAsync(AppDbContext db, DateTime nowUtc, CancellationToken ct)
    {
        var categories = await db.Categories.ToDictionaryAsync(c => c.Slug, c => c.Id, ct);
        var have = (await db.Courses.IgnoreQueryFilters().Select(c => c.Slug).ToListAsync(ct)).ToHashSet();

        // Local builder that assembles a fully-publishable course.
        Course Build(
            string slug, Guid categoryId,
            string titleEn, string titleAr, string summaryEn, string summaryAr,
            string descEn, string descAr,
            CourseDeliveryType delivery, CourseDifficulty difficulty,
            AgeBand band, int minAge, int maxAge,
            string[] modulesEn, string[] modulesAr,
            (string En, string Ar)[] outcomes)
        {
            var course = Course.Create(slug, LocalizedText.Create(titleEn, titleAr), categoryId,
                delivery, difficulty, band, minAge, maxAge, nowUtc);

            course.UpdateDetails(
                LocalizedText.Create(titleEn, titleAr),
                LocalizedText.Create($"{titleEn} — hands-on and fun", $"{titleAr} — تعلّم تطبيقي وممتع"),
                LocalizedText.Create(summaryEn, summaryAr),
                LocalizedText.Create(descEn, descAr),
                nowUtc);

            course.UpdateMedia(
                CourseMedia.Create($"catalog/thumbnails/{slug}.png", $"{titleEn} thumbnail",
                    $"catalog/heroes/{slug}.png"),
                nowUtc);

            course.UpdateOutcomes(outcomes.Select(o => LocalizedText.Create(o.En, o.Ar)), nowUtc);

            for (var i = 0; i < modulesEn.Length; i++)
                course.AddModule(
                    LocalizedText.Create(modulesEn[i], modulesAr.Length > i ? modulesAr[i] : modulesEn[i]),
                    LocalizedText.Create($"What you'll do in {modulesEn[i]}.", $"ما ستقوم به في {modulesEn[i]}."),
                    nowUtc);

            course.AssignInstructor(LeadInstructorA, CourseInstructorRole.Lead, nowUtc);
            course.AssignInstructor(LeadInstructorB, CourseInstructorRole.Assistant, nowUtc);
            return course;
        }

        var toAdd = new List<(Course Course, string Lifecycle)>();

        void Add(string lifecycle, Course course)
        {
            if (have.Contains(course.Slug)) return;
            toAdd.Add((course, lifecycle));
        }

        // Published & listed --------------------------------------------------
        Add("published", Build("scratch-adventures-junior", categories["scratch-block-coding"],
            "Scratch Adventures", "مغامرات سكراتش",
            "Make your first animated game with colorful code blocks.",
            "اصنع أول لعبة متحركة باستخدام كتل برمجية ملوّنة.",
            "A gentle, story-driven introduction to coding with Scratch for our youngest coders.",
            "مقدمة لطيفة قائمة على القصص لتعلّم البرمجة بسكراتش لأصغر المبرمجين.",
            CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Junior, 6, 8,
            new[] { "Meet Scratch", "Move the Sprite", "Make a Game" },
            new[] { "تعرّف على سكراتش", "حرّك الكائن", "اصنع لعبة" },
            new[] { ("Sequence simple instructions", "ترتيب تعليمات بسيطة"), ("Use loops and events", "استخدام الحلقات والأحداث") }));

        Add("published", Build("block-coding-explorers", categories["scratch-block-coding"],
            "Block Coding for Explorers", "البرمجة بالكتل للمستكشفين",
            "Level up your block coding with interactive projects.",
            "طوّر مهاراتك في البرمجة بالكتل عبر مشاريع تفاعلية.",
            "Hybrid course mixing recorded lessons with live build-along sessions.",
            "دورة هجينة تمزج الدروس المسجلة مع جلسات بناء مباشرة.",
            CourseDeliveryType.Hybrid, CourseDifficulty.Beginner, AgeBand.Explorer, 9, 12,
            new[] { "Variables & Scores", "Build a Platformer", "Polish & Share" },
            new[] { "المتغيرات والنقاط", "اصنع لعبة منصات", "التحسين والمشاركة" },
            new[] { ("Track state with variables", "تتبع الحالة بالمتغيرات"), ("Publish a project", "نشر مشروع") }));

        Add("published", Build("intro-web-html-css", categories["web-development"],
            "Intro to Web: HTML & CSS", "مقدمة إلى الويب: HTML وCSS",
            "Build and style your very first web page.",
            "أنشئ وصمّم أول صفحة ويب لك.",
            "Recorded lessons that take students from a blank file to a styled personal page.",
            "دروس مسجلة تأخذ الطلاب من ملف فارغ إلى صفحة شخصية منسّقة.",
            CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Explorer, 10, 13,
            new[] { "HTML Basics", "Styling with CSS", "Your Personal Page" },
            new[] { "أساسيات HTML", "التنسيق بـ CSS", "صفحتك الشخصية" },
            new[] { ("Structure a page with HTML", "بناء صفحة بـ HTML"), ("Style elements with CSS", "تنسيق العناصر بـ CSS") }));

        Add("published", Build("python-first-steps", categories["python"],
            "Python: First Steps", "بايثون: الخطوات الأولى",
            "Write your first real lines of Python code.",
            "اكتب أول أسطر حقيقية من شيفرة بايثون.",
            "A recorded beginner track covering variables, loops, and simple programs.",
            "مسار مسجل للمبتدئين يغطي المتغيرات والحلقات والبرامج البسيطة.",
            CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Explorer, 10, 13,
            new[] { "Hello, Python", "Variables & Math", "Loops & Logic" },
            new[] { "مرحبا بايثون", "المتغيرات والحساب", "الحلقات والمنطق" },
            new[] { ("Run a Python program", "تشغيل برنامج بايثون"), ("Use variables and loops", "استخدام المتغيرات والحلقات") }));

        Add("published", Build("python-games-intermediate", categories["python"],
            "Python Games", "ألعاب بايثون",
            "Build playable games while leveling up your Python.",
            "اصنع ألعابًا قابلة للعب مع تطوير مهاراتك في بايثون.",
            "Live, instructor-led sessions building small games week by week.",
            "جلسات مباشرة بإشراف معلم لبناء ألعاب صغيرة أسبوعًا بأسبوع.",
            CourseDeliveryType.Live, CourseDifficulty.Intermediate, AgeBand.Explorer, 11, 14,
            new[] { "Game Loop", "Player & Input", "Scoring & Levels" },
            new[] { "حلقة اللعبة", "اللاعب والإدخال", "النقاط والمستويات" },
            new[] { ("Structure a game loop", "هيكلة حلقة اللعبة"), ("Handle user input", "التعامل مع إدخال المستخدم") }));

        Add("published", Build("ai-for-kids-intro", categories["ai-for-kids"],
            "AI for Kids", "الذكاء الاصطناعي للأطفال",
            "Discover how computers learn from examples.",
            "اكتشف كيف تتعلّم الحواسيب من الأمثلة.",
            "A friendly recorded intro to machine learning ideas with no-code activities.",
            "مقدمة مسجلة مبسطة لأفكار تعلّم الآلة بأنشطة بدون برمجة.",
            CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Explorer, 10, 13,
            new[] { "What is AI?", "Teaching a Machine", "AI Around Us" },
            new[] { "ما هو الذكاء الاصطناعي؟", "تعليم الآلة", "الذكاء الاصطناعي حولنا" },
            new[] { ("Explain how models learn", "شرح كيف تتعلم النماذج"), ("Spot AI in daily life", "ملاحظة الذكاء الاصطناعي في الحياة") }));

        // Published but UNLISTED ---------------------------------------------
        Add("unlisted", Build("game-design-roblox", categories["game-design"],
            "Game Design Lab", "مختبر تصميم الألعاب",
            "Design game worlds and mechanics that players love.",
            "صمّم عوالم وآليات ألعاب يحبها اللاعبون.",
            "Hybrid lab — currently unlisted while we finalize the schedule.",
            "مختبر هجين — غير مُدرج حاليًا حتى ننهي الجدول.",
            CourseDeliveryType.Hybrid, CourseDifficulty.Intermediate, AgeBand.Explorer, 10, 14,
            new[] { "Game Worlds", "Mechanics", "Playtesting" },
            new[] { "عوالم الألعاب", "الآليات", "اختبار اللعب" },
            new[] { ("Design a game level", "تصميم مستوى لعبة"), ("Run a playtest", "إجراء اختبار لعب") }));

        // Archived ------------------------------------------------------------
        Add("archived", Build("legacy-animation-basics", categories["scratch-block-coding"],
            "Animation Basics (Legacy)", "أساسيات الرسوم المتحركة (قديم)",
            "Our original animation course, kept for reference.",
            "دورتنا الأصلية للرسوم المتحركة، محفوظة للرجوع إليها.",
            "Archived recorded course retained for historical reference.",
            "دورة مسجلة مؤرشفة محفوظة للرجوع التاريخي.",
            CourseDeliveryType.Recorded, CourseDifficulty.Beginner, AgeBand.Junior, 7, 9,
            new[] { "Frames", "Movement", "Export" },
            new[] { "الإطارات", "الحركة", "التصدير" },
            new[] { ("Create simple animations", "إنشاء رسوم متحركة بسيطة") }));

        // Draft (intentionally incomplete: no Arabic copy, no thumbnail) ------
        if (!have.Contains("robotics-starter"))
        {
            var draft = Course.Create("robotics-starter", LocalizedText.Create("Robotics Starter", ""),
                categories["robotics"], CourseDeliveryType.Live, CourseDifficulty.Beginner,
                AgeBand.Junior, 7, 9, nowUtc);
            draft.UpdateDetails(
                LocalizedText.Create("Robotics Starter", ""),
                LocalizedText.Empty,
                LocalizedText.Create("First steps with robots — draft, not ready to publish.", ""),
                LocalizedText.Create("Work-in-progress live robotics course.", ""),
                nowUtc);
            toAdd.Add((draft, "draft"));
        }

        foreach (var (course, lifecycle) in toAdd)
        {
            switch (lifecycle)
            {
                case "published":
                    course.Publish(nowUtc);
                    break;
                case "unlisted":
                    course.Publish(nowUtc);
                    course.SetListing(false, nowUtc);
                    break;
                case "archived":
                    course.Publish(nowUtc);
                    course.Archive(nowUtc);
                    break;
                case "draft":
                default:
                    break; // stays Draft
            }

            db.Courses.Add(course);
        }

        await db.SaveChangesAsync(ct);
    }

    // --- Learning paths ----------------------------------------------------

    private static async Task SeedLearningPathsAsync(AppDbContext db, DateTime nowUtc, CancellationToken ct)
    {
        var have = (await db.LearningPaths.IgnoreQueryFilters().Select(p => p.Slug).ToListAsync(ct)).ToHashSet();
        var courses = await db.Courses.IgnoreQueryFilters().ToDictionaryAsync(c => c.Slug, c => c.Id, ct);

        Guid? CourseId(string slug) => courses.TryGetValue(slug, out var id) ? id : null;

        if (!have.Contains("junior-coder-journey"))
        {
            var path = LearningPath.Create("junior-coder-journey",
                LocalizedText.Create("Junior Coder Journey", "رحلة المبرمج الصغير"), AgeBand.Junior, nowUtc);
            path.UpdateDetails(
                LocalizedText.Create("Junior Coder Journey", "رحلة المبرمج الصغير"),
                LocalizedText.Create("A guided path for our youngest coders.", "مسار موجّه لأصغر المبرمجين."),
                AgeBand.Junior, nowUtc);
            path.UpdateMedia(CourseMedia.Create("catalog/paths/junior-coder-journey.png", "Junior Coder Journey"), nowUtc);

            foreach (var slug in new[] { "scratch-adventures-junior", "block-coding-explorers" })
                if (CourseId(slug) is { } id)
                    path.AddItem(id, null, nowUtc);

            if (path.Items.Count > 0) path.Publish(nowUtc);
            db.LearningPaths.Add(path);
        }

        if (!have.Contains("explorer-web-track"))
        {
            var path = LearningPath.Create("explorer-web-track",
                LocalizedText.Create("Explorer Web Track", "مسار الويب للمستكشفين"), AgeBand.Explorer, nowUtc);
            path.UpdateDetails(
                LocalizedText.Create("Explorer Web Track", "مسار الويب للمستكشفين"),
                LocalizedText.Create("From first web page to first Python game.", "من أول صفحة ويب إلى أول لعبة بايثون."),
                AgeBand.Explorer, nowUtc);
            path.UpdateMedia(CourseMedia.Create("catalog/paths/explorer-web-track.png", "Explorer Web Track"), nowUtc);

            foreach (var slug in new[] { "intro-web-html-css", "python-first-steps", "ai-for-kids-intro" })
                if (CourseId(slug) is { } id)
                    path.AddItem(id, null, nowUtc);

            if (path.Items.Count > 0) path.Publish(nowUtc);
            db.LearningPaths.Add(path);
        }

        await db.SaveChangesAsync(ct);
    }
}
