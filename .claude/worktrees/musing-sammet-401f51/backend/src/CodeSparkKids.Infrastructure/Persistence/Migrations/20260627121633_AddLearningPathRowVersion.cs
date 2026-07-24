using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CodeSparkKids.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLearningPathRowVersion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "LearningPaths",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "LearningPaths");
        }
    }
}
