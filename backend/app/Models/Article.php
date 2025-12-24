<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Article extends Model
{
    protected $fillable = ['title', 'content', 'enhanced_content', 'source_url', 'image_url', 'cite1', 'cite2'];

}
