using System;
using System.ComponentModel.DataAnnotations;

namespace KnockoutUnobtrusive.Models
{
    public class MyModel
    {
        [Required(ErrorMessage = "Name is required")]
        public string Name { get; set; }

        [Range(10, 90, ErrorMessage = "Enter valid age")]
        public int Age { get; set; }

        public bool IsEducated { get; set; }

        [RegularExpression(@"\d+", ErrorMessage = "Enter valida phone")]
        public string Phone { get; set; }

        [Required(ErrorMessage = "ExtraName is required")]
        [Compare("Name", ErrorMessage = "ExtraName must equal Name")]
        public string ExtraName { get; set; }

        [Required(ErrorMessage = "Must enter a date")]
        public DateTime Date { get; set; }
    }
}